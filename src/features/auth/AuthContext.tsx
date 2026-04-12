'use client';

import type { PostgrestSingleResponse, Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { UserRole } from '@/features/auth/authService';
import { supabase } from '@/lib/supabaseClient';
import { initAuthSync } from '@/lib/authSync';

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
						avatar_url: currentUser.user_metadata?.avatar_url,
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
			
			if (currentUser?.id === lastUserId.current && initialised) {
				return;
			}

			setLoading(true);
			setSession(currentSession);
			setUser(currentUser);
			lastUserId.current = currentUser?.id ?? null;

			if (currentUser) {
				const metadata = currentUser.user_metadata;
				if (metadata?.role && metadata?.full_name) {
					setProfile((prev) => {
						if (prev?.id === currentUser.id) {
							return prev;
						}
						return {
							id: currentUser.id,
							full_name: metadata.full_name,
							role: metadata.role as UserRole,
						};
					});
				}

				const profileData = await fetchProfile(currentUser.id, signal);

				if (profileData) {
					setProfile((prev) => {
						if (JSON.stringify(prev) === JSON.stringify(profileData)) {
							return prev;
						}
						return profileData;
					});
				}
			} else {
				setProfile(null);
				setSession(null);
			}
			setLoading(false);
		},
		[fetchProfile, initialised],
	);

	useEffect(() => {
		let isMounted = true;
		const controller = new AbortController();

		const initializeAuth = async () => {
			await initAuthSync();
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
				handleAuthStateChange(currentSession, controller.signal);
			}
		});

		return () => {
			isMounted = false;
			controller.abort();
			subscription.unsubscribe();
		};
	}, [handleAuthStateChange]);

	const refreshProfile = useCallback(async () => {
		if (user) {
			const data = await fetchProfile(user.id);
			if (data) {
				setProfile(data);
			}
		}
	}, [user, fetchProfile]);

	const signOut = useCallback(async () => {
		try {
			await supabase.auth.signOut();
		} finally {
			lastUserId.current = null;
			setProfile(null);
			setUser(null);
			setSession(null);
			localStorage.clear();
			sessionStorage.clear();
		}
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				profile,
				session,
				loading,
				initialised: initialised,
				refreshProfile,
				signOut,
			}}>
			{!initialised ? null : children}
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