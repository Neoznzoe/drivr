import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';

interface FeedSession {
  id: string;
  title?: string;
  description?: string;
  stats: {
    distanceKm: number;
    durationSeconds: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
  };
  vehicle: {
    brand: string;
    model: string;
  };
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  completedAt: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m ${s}s`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return d.toLocaleDateString('fr-FR');
}

function SessionCard({ session }: { session: FeedSession }) {
  const [liked, setLiked] = useState(session.hasLiked);
  const [likesCount, setLikesCount] = useState(session.likesCount);

  const handleLike = async () => {
    try {
      if (liked) {
        await api.delete(`/social/sessions/${session.id}/like`);
        setLiked(false);
        setLikesCount((c) => c - 1);
      } else {
        await api.post(`/social/sessions/${session.id}/like`);
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/session/${session.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.textMuted} />
          </View>
          <View>
            <Text style={styles.displayName}>{session.user.displayName}</Text>
            <Text style={styles.username}>@{session.user.username}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(session.completedAt)}</Text>
      </View>

      {session.title && (
        <Text style={styles.title}>{session.title}</Text>
      )}

      <View style={styles.vehicleInfo}>
        <Ionicons name="car" size={16} color={colors.textSecondary} />
        <Text style={styles.vehicleText}>
          {session.vehicle.brand} {session.vehicle.model}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{session.stats.distanceKm.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(session.stats.durationSeconds)}
          </Text>
          <Text style={styles.statLabel}>durée</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {session.stats.avgSpeedKmh.toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>km/h moy</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {session.stats.maxSpeedKmh.toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>km/h max</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? colors.error : colors.textSecondary}
          />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{session.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeed = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await api.get<{ sessions: FeedSession[] }>('/social/feed');
      setSessions(response.sessions);
    } catch (error) {
      console.error('Feed error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  if (isLoading && sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SessionCard session={item} />}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchFeed(true)}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Aucune session à afficher</Text>
          <Text style={styles.emptySubtext}>
            Ajoutez des amis ou commencez à conduire !
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  username: {
    color: colors.textMuted,
    fontSize: 13,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  vehicleText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  actionTextLiked: {
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
});
