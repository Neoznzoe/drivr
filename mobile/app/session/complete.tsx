import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../../src/stores/session';
import { locationService } from '../../src/services/location';
import { colors } from '../../src/theme/colors';

type Visibility = 'private' | 'friends' | 'public';

const visibilityOptions: { value: Visibility; label: string; icon: string }[] = [
  { value: 'private', label: 'Privé', icon: 'lock-closed' },
  { value: 'friends', label: 'Amis', icon: 'people' },
  { value: 'public', label: 'Public', icon: 'globe' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) {
    return `${h}h ${m}min`;
  }
  return `${m}min`;
}

export default function CompleteSessionScreen() {
  const { stats, points, complete } = useSessionStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastPoint = points[points.length - 1];

  const handleSave = async () => {
    if (!lastPoint) {
      Alert.alert('Erreur', 'Position finale non disponible');
      return;
    }

    setIsSubmitting(true);
    try {
      await complete({
        title: title || undefined,
        description: description || undefined,
        visibility,
        endPoint: {
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
        },
      });

      Alert.alert('Succès', 'Session enregistrée !', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Impossible de sauvegarder'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Abandonner la session',
      'Êtes-vous sûr de vouloir abandonner cette session ? Les données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: async () => {
            const { cancel } = useSessionStore.getState();
            await cancel();
            router.replace('/(tabs)/drive');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Session terminée</Text>

      {/* Stats récap */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.distanceKm.toFixed(2)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={colors.primary} />
            <Text style={styles.statValue}>
              {formatDuration(stats.durationSeconds)}
            </Text>
            <Text style={styles.statLabel}>Durée</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.statValue}>
              {stats.avgSpeedKmh.toFixed(0)} km/h
            </Text>
            <Text style={styles.statLabel}>Vitesse moy.</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={24} color={colors.primary} />
            <Text style={styles.statValue}>
              {stats.maxSpeedKmh.toFixed(0)} km/h
            </Text>
            <Text style={styles.statLabel}>Vitesse max</Text>
          </View>
        </View>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        <Text style={styles.label}>Titre (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Balade du dimanche"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />

        <Text style={styles.label}>Description (optionnelle)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez votre session..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={2000}
        />

        <Text style={styles.label}>Visibilité</Text>
        <View style={styles.visibilityOptions}>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.visibilityOption,
                visibility === option.value && styles.visibilityOptionSelected,
              ]}
              onPress={() => setVisibility(option.value)}
            >
              <Ionicons
                name={option.icon as any}
                size={20}
                color={
                  visibility === option.value ? colors.text : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.visibilityLabel,
                  visibility === option.value && styles.visibilityLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscard}
          disabled={isSubmitting}
        >
          <Text style={styles.discardButtonText}>Abandonner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  form: {
    gap: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },
  visibilityLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityLabelSelected: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  discardButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  discardButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
