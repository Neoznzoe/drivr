import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVehiclesStore } from '../../src/stores/vehicles';
import { useSessionStore } from '../../src/stores/session';
import { locationService } from '../../src/services/location';
import { colors } from '../../src/theme/colors';

export default function DriveScreen() {
  const { vehicles, fetchVehicles, isLoading: vehiclesLoading } = useVehiclesStore();
  const { status: sessionStatus, startSession } = useSessionStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    // Sélectionner le véhicule primaire par défaut
    const primary = vehicles.find((v) => v.isPrimary);
    if (primary && !selectedVehicleId) {
      setSelectedVehicleId(primary.id);
    }
  }, [vehicles, selectedVehicleId]);

  const handleStartSession = async () => {
    if (!selectedVehicleId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un véhicule');
      return;
    }

    setIsStarting(true);
    try {
      // Obtenir la position actuelle
      const location = await locationService.getCurrentLocation();

      // Démarrer la session
      await startSession(selectedVehicleId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Démarrer le tracking GPS
      await locationService.startTracking();

      // Naviguer vers l'écran de session active
      router.push('/session/active');
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible de démarrer la session'
      );
    } finally {
      setIsStarting(false);
    }
  };

  if (vehiclesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="car-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Aucun véhicule</Text>
        <Text style={styles.emptySubtitle}>
          Ajoutez un véhicule pour commencer à enregistrer vos sessions
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/vehicle/add')}
        >
          <Text style={styles.addButtonText}>Ajouter un véhicule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Sélectionnez votre véhicule</Text>

      <View style={styles.vehicleList}>
        {vehicles.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.vehicleCard,
              selectedVehicleId === vehicle.id && styles.vehicleCardSelected,
            ]}
            onPress={() => setSelectedVehicleId(vehicle.id)}
          >
            <View style={styles.vehicleIcon}>
              <Ionicons
                name="car-sport"
                size={32}
                color={
                  selectedVehicleId === vehicle.id
                    ? colors.primary
                    : colors.textSecondary
                }
              />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {vehicle.brand} {vehicle.model}
              </Text>
              {vehicle.year && (
                <Text style={styles.vehicleYear}>{vehicle.year}</Text>
              )}
            </View>
            {selectedVehicleId === vehicle.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.startButton,
          (!selectedVehicleId || isStarting) && styles.startButtonDisabled,
        ]}
        onPress={handleStartSession}
        disabled={!selectedVehicleId || isStarting}
      >
        {isStarting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Ionicons name="play" size={28} color={colors.text} />
            <Text style={styles.startButtonText}>Démarrer la session</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vehicleList: {
    flex: 1,
    gap: 12,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },
  vehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleYear: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  startButtonDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
  startButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
