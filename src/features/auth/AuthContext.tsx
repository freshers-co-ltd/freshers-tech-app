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
import { authService } from '@/features/auth/authService';
import type { Profile, UserRole } from '@/features/auth/types';
import { useProfileRealtime } from '@/features/auth/useProfileRealtime';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { initAuthSync } from '@/lib/authSync';
import { setSuppressSessionBroadcast } from '@/lib/supabaseClient';

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

	const fetchProfile = useCallback(
		async (userId: string, signal?: AbortSignal): Promise<Profile | null> => {
			const { data } = await authService.getProfileWithFallback(userId, signal);
			return data;
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
			} = await authService.getSession();

			if (!initialSession && !window.localStorage.getItem('trust_device')) {
				const syncedSession = window.sessionStorage.getItem('sb-auth-token');
				if (syncedSession) {
					const parsed = JSON.parse(syncedSession);
					await authService.setSession(parsed);
					const {
						data: { session: retrySession },
					} = await authService.getSession();
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
		} = authService.onAuthStateChange((event, currentSession) => {
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
		const trustDevice = window.localStorage.getItem('trust_device');
		try {
			await authService.signOut();
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
			} = await authService.getCurrentUser();

			if (!currentUser) {
				await authService.signOut();
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
