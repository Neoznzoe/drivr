import { create } from 'zustand';
import { api } from '../lib/api';
import { storage } from '../lib/storage';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  stats?: {
    totalDistanceKm: number;
    totalDurationSeconds: number;
    totalSessions: number;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        storage.getAccessToken(),
        storage.getRefreshToken(),
        storage.getUser<User>(),
      ]);

      if (accessToken && refreshToken && user) {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Rafraîchir les infos utilisateur en arrière-plan
        get().refreshAuth();
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const response = await api.post<{
      user: User;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password }, { authenticated: false });

    await storage.setTokens(
      response.tokens.accessToken,
      response.tokens.refreshToken
    );
    await storage.setUser(response.user);

    set({
      user: response.user,
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  register: async (data) => {
    const response = await api.post<{
      user: User;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/register', data, { authenticated: false });

    await storage.setTokens(
      response.tokens.accessToken,
      response.tokens.refreshToken
    );
    await storage.setUser(response.user);

    set({
      user: response.user,
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignorer les erreurs de logout
    }

    await storage.clearAll();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAuth: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await api.post<{
        tokens: { accessToken: string; refreshToken: string };
      }>('/auth/refresh', { refreshToken }, { authenticated: false });

      await storage.setTokens(
        response.tokens.accessToken,
        response.tokens.refreshToken
      );

      set({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      });

      // Récupérer les infos utilisateur à jour
      const meResponse = await api.get<{ user: User }>('/auth/me');
      await storage.setUser(meResponse.user);
      set({ user: meResponse.user });

      return true;
    } catch {
      // Token invalide, déconnecter
      await get().logout();
      return false;
    }
  },

  updateUser: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data };
      set({ user: updatedUser });
      storage.setUser(updatedUser);
    }
  },
}));
