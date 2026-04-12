'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
	coords: { latitude: number; longitude: number } | null;
	error: string | null;
	isLoading: boolean;
}

export function useGeolocation() {
	const [state, setState] = useState<GeolocationState>({
		coords: null,
		error: null,
		isLoading: false,
	});

	const getPosition = useCallback((): Promise<GeolocationPosition> => {
		return new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				timeout: 5000,
				maximumAge: 0,
			});
		});
	}, []);

	const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
		const R = 6371e3;
		const phi1 = (lat1 * Math.PI) / 180;
		const phi2 = (lat2 * Math.PI) / 180;
		const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
		const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

		const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
				Math.cos(phi1) * Math.cos(phi2) *
				Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}, []);

	const checkProximity = useCallback(async (postcode: string, thresholdMetres: number = 200) => {
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		
		try {
			const response = await fetch(`https://api.postcodes.io/postcodes/${postcode.replace(/\s+/g, '')}`);
			const data = await response.json();

			if (data.status !== 200) {
				throw new Error('Invalid postcode');
			}

			const target = {
				latitude: data.result.latitude,
				longitude: data.result.longitude
			};

			const position = await getPosition();
			const distance = calculateDistance(
				position.coords.latitude,
				position.coords.longitude,
				target.latitude,
				target.longitude
			);

			setState({
				coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
				error: null,
				isLoading: false,
			});

			return distance <= thresholdMetres;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Geolocation failed';
			setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
			return false;
		}
	}, [getPosition, calculateDistance]);

	return { ...state, checkProximity };
}