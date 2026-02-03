import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';

interface Segment {
  id: string;
  name: string;
  description?: string;
  type: string;
  distanceKm: number;
  elevationGain?: number;
  totalAttempts: number;
  isOfficial: boolean;
}

const typeLabels: Record<string, string> = {
  col: 'Col',
  autoroute: 'Autoroute',
  nationale: 'Nationale',
  departementale: 'Départementale',
  custom: 'Personnalisé',
};

const typeColors: Record<string, string> = {
  col: '#f59e0b',
  autoroute: '#3b82f6',
  nationale: '#ef4444',
  departementale: '#8b5cf6',
  custom: '#10b981',
};

function SegmentCard({ segment }: { segment: Segment }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/segment/${segment.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{segment.name}</Text>
          {segment.isOfficial && (
            <Ionicons name="checkmark-seal" size={18} color={colors.primary} />
          )}
        </View>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: typeColors[segment.type] || colors.primary },
          ]}
        >
          <Text style={styles.typeText}>{typeLabels[segment.type] || segment.type}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="resize" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{segment.distanceKm.toFixed(1)} km</Text>
        </View>

        {segment.elevationGain && (
          <View style={styles.stat}>
            <Ionicons name="trending-up" size={16} color={colors.textSecondary} />
            <Text style={styles.statText}>{segment.elevationGain} m</Text>
          </View>
        )}

        <View style={styles.stat}>
          <Ionicons name="people" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{segment.totalAttempts} passages</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SegmentsScreen() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchSegments = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const query = filter ? `?type=${filter}` : '';
      const response = await api.get<{ segments: Segment[] }>(
        `/segments${query}`,
        { authenticated: false }
      );
      setSegments(response.segments);
    } catch (error) {
      console.error('Segments error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [filter]);

  const filters = [
    { key: null, label: 'Tous' },
    { key: 'col', label: 'Cols' },
    { key: 'autoroute', label: 'Autoroutes' },
    { key: 'nationale', label: 'Nationales' },
    { key: 'custom', label: 'Perso' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={segments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SegmentCard segment={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchSegments(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : (
              <>
                <Ionicons name="flag-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aucun segment trouvé</Text>
              </>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/segment/create')}
      >
        <Ionicons name="add" size={28} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
