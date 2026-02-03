import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth';
import { colors } from '../../src/theme/colors';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons
        name={icon as any}
        size={22}
        color={danger ? colors.error : colors.textSecondary}
      />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Non connecté</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header / Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.textMuted} />
        </View>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {/* Stats */}
      {user.stats && (
        <View style={styles.statsContainer}>
          <StatCard
            icon="speedometer"
            value={`${user.stats.totalDistanceKm.toFixed(0)} km`}
            label="Distance totale"
          />
          <StatCard
            icon="time"
            value={formatDuration(user.stats.totalDurationSeconds)}
            label="Temps total"
          />
          <StatCard
            icon="flag"
            value={user.stats.totalSessions.toString()}
            label="Sessions"
          />
        </View>
      )}

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.menu}>
          <MenuItem
            icon="person-outline"
            label="Modifier le profil"
            onPress={() => router.push('/profile/edit')}
          />
          <MenuItem
            icon="car-outline"
            label="Mes véhicules"
            onPress={() => router.push('/vehicles')}
          />
          <MenuItem
            icon="list-outline"
            label="Mes sessions"
            onPress={() => router.push('/sessions')}
          />
          <MenuItem
            icon="people-outline"
            label="Mes amis"
            onPress={() => router.push('/friends')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.menu}>
          <MenuItem
            icon="settings-outline"
            label="Paramètres"
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Aide"
            onPress={() => router.push('/help')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <View style={styles.menu}>
          <MenuItem
            icon="log-out-outline"
            label="Se déconnecter"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <Text style={styles.version}>DRIVR v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  displayName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  username: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCard: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  menuSection: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menu: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  version: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
