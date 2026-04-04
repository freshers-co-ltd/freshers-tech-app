import type { PostgrestSingleResponse, Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { UserRole } from '@/features/auth/authService';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
	id: string;
	full_name: string;
	role: UserRole;
	avatar_url?: string;
}

export interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	session: Session | null;
	loading: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchProfile = useCallback(
		async (userId: string, signal?: AbortSignal): Promise<Profile | null> => {
			console.log('[fetchProfile] Starting fetch for userId:', userId);

			const timeout = new Promise<null>((_, reject) => {
				setTimeout(() => {
					console.log('[fetchProfile] TIMEOUT - took longer than 15s for userId:', userId);
					reject(new Error('DB_TIMEOUT'));
				}, 15000);
			});

			try {
				const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();
				console.log('[fetchProfile] Query sent for userId:', userId);

				const { data, error } = await (Promise.race([fetchPromise, timeout]) as Promise<
					PostgrestSingleResponse<Profile>
				>);

				console.log(
					'[fetchProfile] Response received - userId:',
					userId,
					'data:',
					data,
					'error:',
					error,
				);

				if (error) {
					throw error;
				}
				if (signal?.aborted) {
					console.log('[fetchProfile] Signal aborted for userId:', userId);
					return null;
				}
				console.log('[fetchProfile] Successfully returning profile for userId:', userId);
				return data as Profile;
			} catch (err: unknown) {
				console.error('[fetchProfile] Error caught for userId:', userId, 'error:', err);
				if (err instanceof Error && err.name === 'AbortError') {
					return null;
				}
				const {
					data: { user: currentUser },
				} = await supabase.auth.getUser();
				if (currentUser) {
					return {
						id: currentUser.id,
						full_name: currentUser.user_metadata?.full_name || 'User',
						role: (currentUser.user_metadata?.role as UserRole) || 'cleaner',
						avatar_url: currentUser.user_metadata?.avatar_url,
					};
				}
				return null;
			}
		},
		[],
	);

	useEffect(() => {
		let isMounted = true;
		const controller = new AbortController();

		const handleAuthStateChange = async (currentSession: Session | null) => {
			console.log('[handleAuthStateChange] Session change detected:', {
				hasSession: !!currentSession,
				userId: currentSession?.user?.id,
				timestamp: new Date().toISOString(),
			});

			if (!isMounted) {
				console.log('[handleAuthStateChange] Component not mounted, returning');
				return;
			}

			const currentUser = currentSession?.user ?? null;
			console.log(
				'[handleAuthStateChange] Current user:',
				currentUser?.id,
				'email:',
				currentUser?.email,
			);

			setSession(currentSession);
			setUser(currentUser);

			if (currentUser) {
				const metadata = currentUser.user_metadata;
				console.log('[handleAuthStateChange] User metadata:', metadata);

				if (metadata?.role && metadata?.full_name) {
					console.log(
						'[handleAuthStateChange] Setting profile from metadata for userId:',
						currentUser.id,
					);
					setProfile({
						id: currentUser.id,
						full_name: metadata.full_name,
						role: metadata.role as UserRole,
					});
				}

				console.log('[handleAuthStateChange] Fetching profile from DB for userId:', currentUser.id);
				const profileData = await fetchProfile(currentUser.id, controller.signal);
				console.log(
					'[handleAuthStateChange] Profile fetch result for userId:',
					currentUser.id,
					'data:',
					profileData,
				);

				if (isMounted) {
					if (profileData) {
						console.log('[handleAuthStateChange] Setting profile data for userId:', currentUser.id);
						setProfile(profileData);
					}
					setLoading(false);
				}
			} else {
				console.log('[handleAuthStateChange] No current user, clearing auth state');
				if (isMounted) {
					setProfile(null);
					setSession(null);
					setLoading(false);
				}
			}
		};

		const initializeAuth = async () => {
			const {
				data: { session: initialSession },
			} = await supabase.auth.getSession();

			if (!initialSession && !window.localStorage.getItem('trust_device')) {
				const syncedSession = window.sessionStorage.getItem('sb-auth-token');
				if (syncedSession) {
					await supabase.auth.setSession(JSON.parse(syncedSession));
					const {
						data: { session: retrySession },
					} = await supabase.auth.getSession();
					if (isMounted) {
						await handleAuthStateChange(retrySession);
					}
					return;
				}
			}

			if (isMounted) {
				await handleAuthStateChange(initialSession);
			}
		};

		initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, currentSession) => {
			console.log('[onAuthStateChange] Auth event:', event, 'userId:', currentSession?.user?.id);

			if (event === 'SIGNED_OUT') {
				console.log('[onAuthStateChange] SIGNED_OUT event - clearing everything');
				setSession(null);
				setUser(null);
				setProfile(null);
				setLoading(false);
			} else if (
				event === 'INITIAL_SESSION' ||
				event === 'SIGNED_IN' ||
				event === 'TOKEN_REFRESHED'
			) {
				console.log(
					'[onAuthStateChange] Session event:',
					event,
					'userId:',
					currentSession?.user?.id,
				);
				handleAuthStateChange(currentSession);
			}
		});

		return () => {
			isMounted = false;
			controller.abort();
			subscription.unsubscribe();
		};
	}, [fetchProfile]);

	const signOut = useCallback(async () => {
		try {
			await supabase.auth.signOut();
		} finally {
			setProfile(null);
			setUser(null);
			setSession(null);

			localStorage.clear();
			sessionStorage.clear();
		}
	}, []);

	return (
		<AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
