'use client';

import { useCallback, useState } from 'react';

/**
 * State returned by useGeolocation hook.
 */
interface GeolocationState {
	coords: { latitude: number; longitude: number } | null;
	error: string | null;
	isLoading: boolean;
}

/**
 * Response from postcodes.io API for postcode lookup.
 */
interface PostcodeResult {
	status: number;
	result: {
		latitude: number;
		longitude: number;
	};
	error?: string;
}

/** @internal */
const getErrorMessage = (err: unknown): string => {
	if (err instanceof GeolocationPositionError) {
		if (err.code === 1) {
			return 'Location access is blocked. Please check your browser and system privacy settings.';
		}
		if (err.code === 2) {
			return 'Location unavailable. Please ensure your device has a signal (GPS/WiFi).';
		}
		if (err.code === 3) {
			return 'Location request timed out. Please ensure location services are enabled in your device settings.';
		}
	}
	if (err instanceof Error) {
		return err.message;
	}
	return 'Unable to determine your location.';
};

/**
 * Hook for accessing device geolocation and verifying proximity to a postcode.
 * Uses the browser's Geolocation API and postcodes.io for reverse geocoding.
 */
export function useGeolocation() {
	const [state, setState] = useState<GeolocationState>({
		coords: null,
		error: null,
		isLoading: false,
	});

	const getPosition = useCallback(
		(highAccuracy: boolean, timeout: number, maxAge: number): Promise<GeolocationPosition> =>
			new Promise((resolve, reject) => {
				if (!navigator.geolocation) {
					reject(new Error('Geolocation is not supported by this browser.'));
				}
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: highAccuracy,
					timeout: timeout,
					maximumAge: maxAge,
				});
			}),
		[],
	);

	const calculateDistance = useCallback(
		(lat1: number, lon1: number, lat2: number, lon2: number): number => {
			const R = 6371e3;
			const phi1 = (lat1 * Math.PI) / 180;
			const phi2 = (lat2 * Math.PI) / 180;
			const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
			const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
			const a =
				Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
				Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c;
		},
		[],
	);

	const checkProximity = useCallback(
		async (postcode: string, thresholdMetres: number = 500): Promise<boolean> => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			if (import.meta.env.DEV) {
				console.group('[GEOLOCATION_TRACE]');
				console.debug('Target Postcode:', postcode);
			}

			try {
				const response = await fetch(
					`https://api.postcodes.io/postcodes/${postcode.replace(/\s+/g, '')}`,
				);
				const data: PostcodeResult = await response.json();

				if (data.status !== 200) {
					throw new Error(`Invalid Postcode: ${data.error}`);
				}

				const target = { lat: data.result.latitude, lng: data.result.longitude };

				let position: GeolocationPosition;

				try {
					position = await getPosition(true, 10000, 0);
				} catch (posError) {
					if (import.meta.env.DEV) {
						console.debug('High Accuracy failed. Error:', getErrorMessage(posError));
					}
					position = await getPosition(false, 10000, 0);
				}

				const user = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
				};

				if (user.accuracy > 1000) {
					throw new Error(
						`Insufficient location accuracy (${Math.round(user.accuracy)}m). Please turn on WiFi or move to a clearer area.`,
					);
				}

				const distance = calculateDistance(user.lat, user.lng, target.lat, target.lng);
				const isNear = distance <= thresholdMetres;

				if (import.meta.env.DEV) {
					console.debug('Target Resolved:', target);
					console.debug('User Position:', user);
					console.debug('Calculated Distance:', `${distance.toFixed(2)}m`);
					console.debug('Result:', isNear ? 'MATCH' : 'OUT_OF_RANGE');
					console.groupEnd();
				}

				setState({
					coords: { latitude: user.lat, longitude: user.lng },
					error: null,
					isLoading: false,
				});

				return isNear;
			} catch (err) {
				const userMessage = getErrorMessage(err);

				if (import.meta.env.DEV) {
					console.error('[GEOLOCATION_TRACE] Failure:', userMessage);
					console.debug('Error Details:', err);
					console.groupEnd();
				}

				setState((prev) => ({ ...prev, isLoading: false, error: userMessage }));
				return false;
			}
		},
		[getPosition, calculateDistance],
	);

	return { ...state, checkProximity };
}
