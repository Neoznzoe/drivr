import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSessionStore } from '../../src/stores/session';
import { locationService } from '../../src/services/location';
import { colors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export default function ActiveSessionScreen() {
  const {
    status,
    stats,
    points,
    pause,
    resume,
    cancel,
    startTime,
  } = useSessionStore();

  const [duration, setDuration] = useState(0);

  // Timer pour la durée
  useEffect(() => {
    if (status !== 'active' || !startTime) return;

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startTime]);

  const handlePause = async () => {
    try {
      await pause();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre en pause');
    }
  };

  const handleResume = async () => {
    try {
      await resume();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de reprendre');
    }
  };

  const handleStop = () => {
    Alert.alert(
      'Terminer la session',
      'Voulez-vous terminer et sauvegarder cette session ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          onPress: async () => {
            await locationService.stopTracking();
            router.replace('/session/complete');
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la session',
      'Êtes-vous sûr de vouloir annuler cette session ? Les données seront perdues.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            await locationService.stopTracking();
            await cancel();
            router.replace('/(tabs)/drive');
          },
        },
      ]
    );
  };

  const lastPoint = points[points.length - 1];
  const routeCoordinates = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={
            lastPoint
              ? {
                  latitude: lastPoint.latitude,
                  longitude: lastPoint.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
          region={
            lastPoint
              ? {
                  latitude: lastPoint.latitude,
                  longitude: lastPoint.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
          showsUserLocation
          followsUserLocation
        >
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.map.route}
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            status === 'paused' && styles.statusBadgePaused,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              status === 'paused' && styles.statusDotPaused,
            ]}
          />
          <Text style={styles.statusText}>
            {status === 'active' ? 'En cours' : 'En pause'}
          </Text>
        </View>
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        {/* Speed */}
        <View style={styles.speedContainer}>
          <Text style={styles.speedValue}>
            {stats.currentSpeedKmh.toFixed(0)}
          </Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>

        {/* Other stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.distanceKm.toFixed(2)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>durée</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgSpeedKmh.toFixed(0)}</Text>
            <Text style={styles.statLabel}>km/h moy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.maxSpeedKmh.toFixed(0)}</Text>
            <Text style={styles.statLabel}>km/h max</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close" size={28} color={colors.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pauseButton}
            onPress={status === 'active' ? handlePause : handleResume}
          >
            <Ionicons
              name={status === 'active' ? 'pause' : 'play'}
              size={32}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Ionicons name="stop" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  statusDotPaused: {
    backgroundColor: colors.text,
  },
  statusText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  statsPanel: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 24,
  },
  speedValue: {
    color: colors.primary,
    fontSize: 72,
    fontWeight: '700',
  },
  speedUnit: {
    color: colors.textSecondary,
    fontSize: 24,
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  cancelButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
