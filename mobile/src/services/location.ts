import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { config } from '../config';
import { useSessionStore } from '../stores/session';

const LOCATION_TASK_NAME = config.locationTaskName;

// Définir la tâche de tracking en arrière-plan
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const sessionStore = useSessionStore.getState();

    if (sessionStore.status !== 'active') return;

    for (const location of locations) {
      sessionStore.addPoint({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? undefined,
        speedKmh: location.coords.speed
          ? location.coords.speed * 3.6 // m/s -> km/h
          : undefined,
        heading: location.coords.heading ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    }

    // Synchroniser périodiquement avec le serveur
    if (sessionStore.points.length % 10 === 0) {
      await sessionStore.syncPoints();
    }
  }
});

export const locationService = {
  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();

    return backgroundStatus === 'granted';
  },

  async startTracking(): Promise<void> {
    const hasPermission = await this.requestPermissions();

    if (!hasPermission) {
      throw new Error('Permission de localisation refusée');
    }

    // Vérifier si le tracking est déjà actif
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

    if (hasStarted) {
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: config.locationUpdateInterval,
      distanceInterval: config.locationDistanceInterval,
      foregroundService: {
        notificationTitle: 'DRIVR',
        notificationBody: 'Session de conduite en cours...',
        notificationColor: '#16a34a',
      },
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
    });
  },

  async stopTracking(): Promise<void> {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  },

  async getCurrentLocation(): Promise<Location.LocationObject> {
    const hasPermission = await this.requestPermissions();

    if (!hasPermission) {
      throw new Error('Permission de localisation refusée');
    }

    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
  },
};
