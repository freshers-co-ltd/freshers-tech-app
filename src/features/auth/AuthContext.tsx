'use client';

import type { PostgrestSingleResponse, Session, User } from '@supabase/supabase-js';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import type { Profile, UserRole } from '@/features/auth/authService';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { initAuthSync } from '@/lib/authSync';
import { setSuppressSessionBroadcast, supabase } from '@/lib/supabaseClient';

export interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	session: Session | null;
	loading: boolean;
	initialised: boolean;
	refreshProfile: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [initialised, setInitialised] = useState(false);

	const lastUserId = useRef<string | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const profileChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const fetchProfile = useCallback(
		async (
			userId: string,
			signal?: AbortSignal,
			retryCount: number = 0,
		): Promise<Profile | null> => {
			const timeout = new Promise<null>((_, reject) => {
				setTimeout(() => {
					reject(new Error('DB_TIMEOUT'));
				}, 10000);
			});

			try {
				const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();
				const { data, error } = await (Promise.race([fetchPromise, timeout]) as Promise<
					PostgrestSingleResponse<Profile>
				>);

				if (error) {
					throw error;
				}

				if (signal?.aborted) {
					return null;
				}

				return data as Profile;
			} catch (err: unknown) {
				if (retryCount < 2 && !(err instanceof Error && err.name === 'AbortError')) {
					await new Promise((resolve) => setTimeout(resolve, 2000));
					return fetchProfile(userId, signal, retryCount + 1);
				}
				const {
					data: { user: currentUser },
				} = await supabase.auth.getUser();
				if (currentUser) {
					return {
						id: currentUser.id,
						full_name: currentUser.user_metadata?.full_name || 'User',
						role: (currentUser.user_metadata?.role as UserRole) || 'cleaner',
						avatar_url: currentUser.user_metadata?.avatar_url || null,
						email: currentUser.email || '',
						is_verified: false,
					};
				}
				return null;
			}
		},
		[],
	);

	const handleAuthStateChange = useCallback(
		async (currentSession: Session | null, signal?: AbortSignal) => {
			const currentUser = currentSession?.user ?? null;

			if (currentUser?.id === lastUserId.current && profile !== null) {
				return;
			}

			setLoading(true);
			setSession(currentSession);
			setUser(currentUser);
			lastUserId.current = currentUser?.id ?? null;

			if (currentUser) {
				if (!profile || profile.id !== currentUser.id) {
					const metadata = currentUser.user_metadata;
					const initialProfile: Profile = {
						id: currentUser.id,
						full_name: metadata?.full_name || 'User',
						role: (metadata?.role as UserRole) || 'cleaner',
						avatar_url: metadata?.avatar_url || null,
						email: currentUser.email || '',
						is_verified: false,
					};
					setProfile(initialProfile);
				}

				const profileData = await fetchProfile(currentUser.id, signal);
				if (profileData && !signal?.aborted) {
					setProfile(profileData);
				}
			} else {
				setProfile(null);
				setSession(null);
			}
			setLoading(false);
		},
		[fetchProfile, profile],
	);

	useEffect(() => {
		let isMounted = true;
		const controller = new AbortController();
		abortControllerRef.current = controller;

		const initializeAuth = async () => {
			await initAuthSync();

			const hash = window.location.hash || '';
			const isRecoveryFlow = hash.includes('type=recovery') || hash.includes('type=invite');
			if (isRecoveryFlow) {
				setSuppressSessionBroadcast(true);
			}

			const {
				data: { session: initialSession },
			} = await supabase.auth.getSession();

			if (!initialSession && !window.localStorage.getItem('trust_device')) {
				const syncedSession = window.sessionStorage.getItem('sb-auth-token');
				if (syncedSession) {
					const parsed = JSON.parse(syncedSession);
					await supabase.auth.setSession(parsed);
					const {
						data: { session: retrySession },
					} = await supabase.auth.getSession();
					if (isMounted) {
						await handleAuthStateChange(retrySession, controller.signal);
						setInitialised(true);
					}
					return;
				}
			}

			if (isMounted) {
				await handleAuthStateChange(initialSession, controller.signal);
				setInitialised(true);
			}
		};

		initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, currentSession) => {
			if (event === 'SIGNED_OUT') {
				setSuppressSessionBroadcast(false);
				lastUserId.current = null;
				setSession(null);
				setUser(null);
				setProfile(null);
				setLoading(false);
			} else if (
				event === 'INITIAL_SESSION' ||
				event === 'SIGNED_IN' ||
				(event === 'TOKEN_REFRESHED' && currentSession?.user?.id !== lastUserId.current)
			) {
				abortControllerRef.current?.abort();
				abortControllerRef.current = new AbortController();
				handleAuthStateChange(currentSession, abortControllerRef.current.signal);
			}
		});

		return () => {
			isMounted = false;
			controller.abort();
			subscription.unsubscribe();
		};
	}, [handleAuthStateChange]);

	const cleanupProfileChannel = useCallback(() => {
		if (profileChannelRef.current) {
			supabase.removeChannel(profileChannelRef.current);
			profileChannelRef.current = null;
		}
	}, []);

	const setupProfileChannel = useCallback(() => {
		if (!user) {
			return;
		}

		if (profileChannelRef.current) {
			return;
		}

		const newChannel = supabase
			.channel('profile-realtime')
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'profiles',
					filter: `id=eq.${user.id}`,
				},
				async () => {
					const data = await fetchProfile(user.id);
					if (data) {
						setProfile(data);
					}
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err) {
					console.error('[Auth] Profile channel error', { status, error: err });
				}
			});

		profileChannelRef.current = newChannel;
	}, [user, fetchProfile]);

	useEffect(() => {
		if (!user) {
			cleanupProfileChannel();
			return;
		}

		setupProfileChannel();

		return () => {
			cleanupProfileChannel();
		};
	}, [user, setupProfileChannel, cleanupProfileChannel]);

	const refreshProfile = useCallback(async () => {
		if (user) {
			const data = await fetchProfile(user.id);
			if (data) {
				setProfile(data);
			}
		}
	}, [user, fetchProfile]);

	const signOut = useCallback(async () => {
		const trustDevice = window.localStorage.getItem('trust_device');
		try {
			await supabase.auth.signOut();
		} finally {
			setSuppressSessionBroadcast(false);
			lastUserId.current = null;
			setProfile(null);
			setUser(null);
			setSession(null);
			window.localStorage.clear();
			window.sessionStorage.clear();
			if (trustDevice === 'true') {
				window.localStorage.setItem('trust_device', 'true');
			}
		}
	}, []);

	useVisibilityReconnect({
		enabled: !!user,
		onVisible: async () => {
			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser();

			if (!currentUser) {
				await supabase.auth.signOut();
				lastUserId.current = null;
				setSession(null);
				setUser(null);
				setProfile(null);
				const trustDevice = window.localStorage.getItem('trust_device');
				window.localStorage.clear();
				window.sessionStorage.clear();
				if (trustDevice === 'true') {
					window.localStorage.setItem('trust_device', 'true');
				}
				window.location.href = '/login?reason=session_expired';
				return;
			}

			await refreshProfile();
			if (!profileChannelRef.current || profileChannelRef.current.state !== 'joined') {
				setupProfileChannel();
			}
		},
	});

	return (
		<AuthContext.Provider
			value={{
				user,
				profile,
				session,
				loading,
				initialised,
				refreshProfile,
				signOut,
			}}>
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
