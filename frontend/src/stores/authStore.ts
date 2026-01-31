import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'polymind-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Token 管理
export const getToken = () => useAuthStore.getState().accessToken;

export const setAuthToken = (token: string) => {
  useAuthStore.setState({ accessToken: token, isAuthenticated: true });
};

export const clearAuthToken = () => {
  useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: null });
};
