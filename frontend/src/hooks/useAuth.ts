import { useAuthStore, getToken } from '../stores/authStore';

export const useAuth = () => {
  const authStore = useAuthStore();

  return {
    user: authStore.user,
    token: authStore.accessToken,
    isAuthenticated: authStore.isAuthenticated,
    logout: authStore.logout,
    updateUser: authStore.updateUser,
  };
};

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
