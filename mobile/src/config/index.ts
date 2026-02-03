export const config = {
  // API_URL depuis le .env racine (via EXPO_PUBLIC_API_URL)
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',

  // Tracking GPS
  locationTaskName: 'DRIVR_LOCATION_TRACKING',
  locationUpdateInterval: 3000, // ms
  locationDistanceInterval: 10, // mètres
} as const;
