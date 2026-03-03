import type { PostgrestSingleResponse, Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { UserRole } from '@/lib/authService';
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

	const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
		const timeout = new Promise<null>((_, reject) =>
			setTimeout(() => reject(new Error('DB_TIMEOUT')), 3000),
		);

		try {
			const fetchPromise = supabase.from('profiles').select('*').eq('id', userId).single();
			const { data, error } = await (Promise.race([fetchPromise, timeout]) as Promise<
				PostgrestSingleResponse<Profile>
			>);

			if (error) {
				throw error;
			}
			return data as Profile;
		} catch (err) {
			console.warn('[AuthContext] Profile fetch failed. Falling back to metadata.', err);
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				return {
					id: user.id,
					full_name: user.user_metadata?.full_name || 'User',
					role: user.user_metadata?.role || 'host',
				};
			}
			return null;
		}
	}, []);

	useEffect(() => {
		let isMounted = true;

		const handleAuthStateChange = async (currentSession: Session | null) => {
			if (!isMounted) {
				return;
			}
			const currentUser = currentSession?.user ?? null;

			setSession(currentSession);
			setUser(currentUser);

			if (currentUser) {
				const profileData = await fetchProfile(currentUser.id);
				if (isMounted) {
					setProfile(profileData);
					setLoading(false);
				}
			} else {
				if (isMounted) {
					setProfile(null);
					setLoading(false);
				}
			}
		};

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (isMounted) {
				handleAuthStateChange(session);
			}
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, currentSession) => {
			if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
				handleAuthStateChange(currentSession);
			} else if (event === 'PASSWORD_RECOVERY') {
				setSession(currentSession);
				setUser(currentSession?.user ?? null);
				setLoading(false);
			} else if (event === 'SIGNED_OUT') {
				setUser(null);
				setSession(null);
				setProfile(null);
				setLoading(false);
			}
		});

		return () => {
			isMounted = false;
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
