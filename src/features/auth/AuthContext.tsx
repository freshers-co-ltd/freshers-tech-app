'use client';

import type { Session, User } from '@supabase/supabase-js';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { authService } from '@/features/auth/services/authService';
import { mfaService } from '@/features/auth/services/mfaService';
import { profileService } from '@/features/auth/services/profileService';
import type { Profile, UserRole } from '@/features/auth/types';
import { useProfileRealtime } from '@/features/auth/useProfileRealtime';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { initAuthSync } from '@/lib/authSync';
import { setSessionBroadcastSuppressed } from '@/lib/supabaseClient';

export interface AuthContextType {
	user: User | null;
	profile: Profile | null;
	session: Session | null;
	loading: boolean;
	initialised: boolean;
	mfaAction: 'enroll' | 'challenge' | null;
	refreshProfile: () => Promise<void>;
	signOut: () => Promise<void>;
	resolveMfaAction: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [initialised, setInitialised] = useState(false);
	const [mfaAction, setMfaAction] = useState<'enroll' | 'challenge' | null>(null);

	const lastUserId = useRef<string | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const isVoluntarySignOutRef = useRef(false);
	const mfaResolvingRef = useRef(false);
	const authReadyRef = useRef(false);

	const fetchProfile = useCallback(
		async (userId: string, signal?: AbortSignal): Promise<Profile | null> => {
			const { data, error } = await profileService.getProfileWithFallback(userId, signal);
			if (error) {
				console.error('Failed to fetch profile:', error);
			}
			if (data && !data.email) {
				const {
					data: { user },
				} = await authService.getCurrentUser();
				data.email = user?.email ?? '';
			}
			return data;
		},
		[],
	);

	const profileRef = useRef(profile);
	profileRef.current = profile;

	const handleAuthStateChange = useCallback(
		async (currentSession: Session | null, signal?: AbortSignal) => {
			const currentUser = currentSession?.user ?? null;

			if (currentUser?.id === lastUserId.current && profileRef.current !== null) {
				return;
			}

			setLoading(true);
			setSession(currentSession);
			setUser(currentUser);
			lastUserId.current = currentUser?.id ?? null;

			if (currentUser) {
				if (!profileRef.current || profileRef.current.id !== currentUser.id) {
					const metadata = currentUser.user_metadata;
					const rawRole = metadata?.role;
					const userRole: UserRole =
						rawRole === 'admin' || rawRole === 'host' || rawRole === 'cleaner'
							? rawRole
							: 'cleaner';
					const initialProfile: Profile = {
						id: currentUser.id,
						full_name: metadata?.full_name || 'User',
						role: userRole,
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
		[fetchProfile],
	);

	useEffect(() => {
		let isMounted = true;
		const controller = new AbortController();
		abortControllerRef.current = controller;

		const initializeAuth = async () => {
			await initAuthSync();

			const hash = window.location.hash || '';
			const search = window.location.search || '';
			const isInviteFlow = window.location.pathname === '/set-password';
			const isPkceRecoveryFlow =
				search.includes('type=recovery') ||
				hash.includes('type=recovery') ||
				(search.includes('code=') && window.location.pathname === '/update-password');

			if (isInviteFlow) {
				setSessionBroadcastSuppressed(true);
				setLoading(false);
				setInitialised(true);
				return;
			}

			if (isPkceRecoveryFlow) {
				setSessionBroadcastSuppressed(true);
				if (isMounted) {
					setLoading(false);
					setInitialised(true);
				}
				return;
			}

			let {
				data: { session: initialSession },
			} = await authService.getSession();

			const isTrusted = window.localStorage.getItem('trust_device') === 'true';
			if (!initialSession && isTrusted) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				const retry = await authService.getSession();
				initialSession = retry.data.session;
			}

			if (!initialSession && !isTrusted) {
				const syncedSession = window.sessionStorage.getItem('sb-auth-token');
				if (syncedSession) {
					let parsed: { access_token: string; refresh_token: string } | null = null;
					try {
						parsed = JSON.parse(syncedSession);
					} catch {
						if (import.meta.env.DEV) {
							console.error('[Auth] Failed to parse session token');
						}
						parsed = null;
					}
					if (!parsed) {
						return;
					}
					await authService.setSession(parsed);
					const {
						data: { session: retrySession },
					} = await authService.getSession();
					if (isMounted) {
						await handleAuthStateChange(retrySession, controller.signal);
						setInitialised(true);
						authReadyRef.current = true;
					}
					return;
				}
			}

			if (!initialSession && isTrusted) {
				const storedToken = window.localStorage.getItem('sb-auth-token');
				if (storedToken) {
					let parsed: { access_token: string; refresh_token: string } | null = null;
					try {
						parsed = JSON.parse(storedToken);
					} catch {
						if (import.meta.env.DEV) {
							console.error('[Auth] Failed to parse trusted session token');
						}
						parsed = null;
					}
					if (!parsed) {
						return;
					}
					await authService.setSession(parsed);
					const {
						data: { session: retrySession },
					} = await authService.getSession();
					if (isMounted) {
						await handleAuthStateChange(retrySession, controller.signal);
						setInitialised(true);
						authReadyRef.current = true;
					}
					return;
				}
			}

			if (isMounted) {
				await handleAuthStateChange(initialSession, controller.signal);
				setInitialised(true);
				authReadyRef.current = true;
			}
		};

		initializeAuth();

		const {
			data: { subscription },
		} = authService.onAuthStateChange(async (event, currentSession) => {
			if (event === 'SIGNED_OUT') {
				const isTrusted = window.localStorage.getItem('trust_device') === 'true';

				if (isTrusted && !isVoluntarySignOutRef.current) {
					try {
						const storedToken = window.localStorage.getItem('sb-auth-token');
						if (storedToken) {
							const parsed = JSON.parse(storedToken);
							await authService.setSession(parsed);
						}
					} catch {
						if (import.meta.env.DEV) {
							console.error('[Auth] Failed to recover session after sign-out');
						}
					}
					return;
				}

				abortControllerRef.current?.abort();
				abortControllerRef.current = null;
				setSessionBroadcastSuppressed(false);
				lastUserId.current = null;
				setSession(null);
				setUser(null);
				setProfile(null);
				setLoading(false);
			} else if (
				(event === 'INITIAL_SESSION' && authReadyRef.current) ||
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

	const { reconnect: reconnectProfileChannel } = useProfileRealtime(
		user?.id,
		fetchProfile,
		setProfile,
	);

	const refreshProfile = useCallback(async () => {
		if (user) {
			const data = await fetchProfile(user.id);
			if (data) {
				setProfile(data);
			}
		}
	}, [user, fetchProfile]);

	const signOut = useCallback(async () => {
		isVoluntarySignOutRef.current = true;
		try {
			await authService.signOut();
		} finally {
			isVoluntarySignOutRef.current = false;
			setSessionBroadcastSuppressed(false);
			lastUserId.current = null;
			setProfile(null);
			setUser(null);
			setSession(null);
			['sb-auth-token', 'vapidPublicKey', 'trust_device'].forEach((key) => {
				window.localStorage.removeItem(key);
			});
			window.sessionStorage.clear();
		}
	}, []);

	useEffect(() => {
		if (!initialised || !profile?.role) {
			return;
		}
		if (profile.role !== 'admin') {
			return;
		}

		let cancelled = false;

		mfaService.checkMfaStatus().then(({ data }) => {
			if (cancelled || mfaResolvingRef.current) {
				return;
			}
			if (!data?.enrolled) {
				setMfaAction('enroll');
			} else if (!data?.verified) {
				setMfaAction('challenge');
			}
		});

		return () => {
			cancelled = true;
		};
	}, [initialised, profile?.role]);

	const resolveMfaAction = useCallback(() => {
		mfaResolvingRef.current = true;
		setMfaAction(null);
		setTimeout(() => {
			mfaResolvingRef.current = false;
		}, 2000);
	}, []);

	useVisibilityReconnect({
		enabled: !!user,
		onVisible: async () => {
			const isTrusted = window.localStorage.getItem('trust_device') === 'true';

			if (isTrusted && !navigator.onLine) {
				await refreshProfile();
				reconnectProfileChannel();
				return;
			}

			let currentUser: User | null = null;
			for (let attempt = 0; attempt < 3; attempt++) {
				if (attempt > 0) {
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				}
				const result = await authService.getCurrentUser();
				currentUser = result.data?.user ?? null;
				if (currentUser) {
					break;
				}
			}

			if (!currentUser) {
				if (isTrusted) {
					await refreshProfile();
					reconnectProfileChannel();
					return;
				}

				await authService.signOut();
				lastUserId.current = null;
				setSession(null);
				setUser(null);
				setProfile(null);
				const storedTrustDevice = window.localStorage.getItem('trust_device');
				window.localStorage.clear();
				window.sessionStorage.clear();
				if (storedTrustDevice === 'true') {
					window.localStorage.setItem('trust_device', 'true');
				}
				window.location.href = '/login?reason=session_expired';
				return;
			}

			await refreshProfile();
			reconnectProfileChannel();
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
				mfaAction,
				refreshProfile,
				signOut,
				resolveMfaAction,
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
