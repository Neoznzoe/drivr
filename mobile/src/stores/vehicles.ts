import { create } from 'zustand';
import { api } from '../lib/api';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  photoUrl?: string;
  engineType?: string;
  horsepower?: number;
  stats: {
    totalDistanceKm: number;
    totalDurationSeconds: number;
    totalSessions: number;
  };
  isPrimary: boolean;
  createdAt: string;
}

interface VehiclesState {
  vehicles: Vehicle[];
  isLoading: boolean;

  // Actions
  fetchVehicles: () => Promise<void>;
  addVehicle: (data: Omit<Vehicle, 'id' | 'stats' | 'isPrimary' | 'createdAt'>) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setPrimary: (id: string) => Promise<void>;
  getPrimaryVehicle: () => Vehicle | undefined;
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  isLoading: false,

  fetchVehicles: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
      set({ vehicles: response.vehicles });
    } finally {
      set({ isLoading: false });
    }
  },

  addVehicle: async (data) => {
    const response = await api.post<{ vehicle: Vehicle }>('/vehicles', data);
    set((state) => ({
      vehicles: [...state.vehicles, response.vehicle],
    }));
    return response.vehicle;
  },

  updateVehicle: async (id, data) => {
    await api.patch(`/vehicles/${id}`, data);
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === id ? { ...v, ...data } : v
      ),
    }));
  },

  deleteVehicle: async (id) => {
    await api.delete(`/vehicles/${id}`);
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
    }));
  },

  setPrimary: async (id) => {
    await api.post(`/vehicles/${id}/set-primary`);
    set((state) => ({
      vehicles: state.vehicles.map((v) => ({
        ...v,
        isPrimary: v.id === id,
      })),
    }));
  },

  getPrimaryVehicle: () => {
    return get().vehicles.find((v) => v.isPrimary);
  },
}));
