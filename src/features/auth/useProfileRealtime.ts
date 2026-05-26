'use client';

import { useEffect, useRef } from 'react';
import type { Profile } from '@/features/auth/types';
import { supabase } from '@/lib/supabaseClient';

export function useProfileRealtime(
	userId: string | undefined,
	fetchProfile: (userId: string) => Promise<Profile | null>,
	onProfileUpdate: (profile: Profile) => void,
) {
	const profileChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
	const fetchProfileRef = useRef(fetchProfile);
	fetchProfileRef.current = fetchProfile;
	const onProfileUpdateRef = useRef(onProfileUpdate);
	onProfileUpdateRef.current = onProfileUpdate;

	useEffect(() => {
		if (!userId) {
			if (profileChannelRef.current) {
				supabase.removeChannel(profileChannelRef.current);
				profileChannelRef.current = null;
			}
			return;
		}

		if (profileChannelRef.current) {
			return;
		}

		const currentUserId = userId;
		const newChannel = supabase
			.channel('profile-realtime')
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'profiles',
					filter: `id=eq.${currentUserId}`,
				},
				async () => {
					const data = await fetchProfileRef.current(currentUserId);
					if (data) {
						onProfileUpdateRef.current(data);
					}
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err) {
					console.error('[Auth] Profile channel error', { status, error: err });
				}
			});

		profileChannelRef.current = newChannel;

		return () => {
			if (profileChannelRef.current) {
				supabase.removeChannel(profileChannelRef.current);
				profileChannelRef.current = null;
			}
		};
	}, [userId]);

	const reconnect = () => {
		if (!profileChannelRef.current || profileChannelRef.current.state !== 'joined') {
			const currentUserId = userId;
			if (!currentUserId) {
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
						filter: `id=eq.${currentUserId}`,
					},
					async () => {
						const data = await fetchProfileRef.current(currentUserId);
						if (data) {
							onProfileUpdateRef.current(data);
						}
					},
				)
				.subscribe((status: string, err?: unknown) => {
					if (err) {
						console.error('[Auth] Profile channel error', { status, error: err });
					}
				});

			profileChannelRef.current = newChannel;
		}
	};

	return { reconnect };
}
