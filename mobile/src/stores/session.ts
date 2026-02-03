import { create } from 'zustand';
import { api } from '../lib/api';

interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speedKmh?: number;
  heading?: number;
  accuracy?: number;
  recordedAt: string;
}

interface SessionStats {
  distanceKm: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  currentSpeedKmh: number;
}

interface SessionState {
  // État de la session active
  activeSessionId: string | null;
  status: 'idle' | 'active' | 'paused';
  vehicleId: string | null;

  // Données temps réel
  points: GpsPoint[];
  stats: SessionStats;
  startTime: Date | null;

  // Actions
  startSession: (vehicleId: string, startPoint: { latitude: number; longitude: number }) => Promise<void>;
  addPoint: (point: GpsPoint) => void;
  syncPoints: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  complete: (data: {
    title?: string;
    description?: string;
    visibility: 'private' | 'friends' | 'public';
    endPoint: { latitude: number; longitude: number };
  }) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSessionId: null,
  status: 'idle',
  vehicleId: null,
  points: [],
  stats: {
    distanceKm: 0,
    durationSeconds: 0,
    avgSpeedKmh: 0,
    maxSpeedKmh: 0,
    currentSpeedKmh: 0,
  },
  startTime: null,

  startSession: async (vehicleId, startPoint) => {
    const response = await api.post<{
      session: { id: string; status: string; startedAt: string };
    }>('/sessions', { vehicleId, startPoint });

    set({
      activeSessionId: response.session.id,
      status: 'active',
      vehicleId,
      points: [],
      stats: {
        distanceKm: 0,
        durationSeconds: 0,
        avgSpeedKmh: 0,
        maxSpeedKmh: 0,
        currentSpeedKmh: 0,
      },
      startTime: new Date(response.session.startedAt),
    });
  },

  addPoint: (point) => {
    const { points, stats } = get();
    const newPoints = [...points, point];

    // Calculer les stats en temps réel
    let totalDistance = 0;
    let totalSpeed = 0;
    let maxSpeed = stats.maxSpeedKmh;
    let speedCount = 0;

    for (let i = 1; i < newPoints.length; i++) {
      const prev = newPoints[i - 1];
      const curr = newPoints[i];

      // Distance (formule haversine simplifiée)
      const R = 6371; // km
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.latitude * Math.PI) / 180) *
          Math.cos((curr.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;

      if (curr.speedKmh !== undefined) {
        totalSpeed += curr.speedKmh;
        speedCount++;
        maxSpeed = Math.max(maxSpeed, curr.speedKmh);
      }
    }

    const durationSeconds = get().startTime
      ? Math.floor((Date.now() - get().startTime!.getTime()) / 1000)
      : 0;

    set({
      points: newPoints,
      stats: {
        distanceKm: totalDistance,
        durationSeconds,
        avgSpeedKmh: speedCount > 0 ? totalSpeed / speedCount : 0,
        maxSpeedKmh: maxSpeed,
        currentSpeedKmh: point.speedKmh || 0,
      },
    });
  },

  syncPoints: async () => {
    const { activeSessionId, points } = get();
    if (!activeSessionId || points.length === 0) return;

    // Envoyer les points au serveur par batch
    const pointsToSync = points.slice(-50); // Derniers 50 points
    await api.post(`/sessions/${activeSessionId}/points/batch`, pointsToSync);
  },

  pause: async () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    await api.post(`/sessions/${activeSessionId}/pause`);
    set({ status: 'paused' });
  },

  resume: async () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    await api.post(`/sessions/${activeSessionId}/resume`);
    set({ status: 'active' });
  },

  complete: async (data) => {
    const { activeSessionId, points } = get();
    if (!activeSessionId) return;

    // Synchroniser les derniers points
    if (points.length > 0) {
      await api.post(`/sessions/${activeSessionId}/points/batch`, points);
    }

    // Compléter la session
    await api.post(`/sessions/${activeSessionId}/complete`, data);

    // Reset
    get().reset();
  },

  cancel: async () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    await api.delete(`/sessions/${activeSessionId}/cancel`);
    get().reset();
  },

  reset: () => {
    set({
      activeSessionId: null,
      status: 'idle',
      vehicleId: null,
      points: [],
      stats: {
        distanceKm: 0,
        durationSeconds: 0,
        avgSpeedKmh: 0,
        maxSpeedKmh: 0,
        currentSpeedKmh: 0,
      },
      startTime: null,
    });
  },
}));
