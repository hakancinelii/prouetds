import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  driverId?: string | null;
  tenant?: { id: string; companyName: string };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
  impersonatedTenant: { id: string; companyName: string } | null;
  setImpersonatedTenant: (tenant: { id: string; companyName: string } | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  impersonatedTenant: null,

  setImpersonatedTenant: (tenant) => {
    if (typeof window !== 'undefined') {
      if (tenant) {
        localStorage.setItem('impersonateTenantId', tenant.id);
        localStorage.setItem('impersonateTenantName', tenant.companyName);
      } else {
        localStorage.removeItem('impersonateTenantId');
        localStorage.removeItem('impersonateTenantName');
      }
    }
    set({ impersonatedTenant: tenant });
  },

  login: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonateTenantId');
    localStorage.removeItem('impersonateTenantName');
    set({ user: null, isAuthenticated: false, isLoading: false, impersonatedTenant: null });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const impId = localStorage.getItem('impersonateTenantId');
    const impName = localStorage.getItem('impersonateTenantName');
    const impersonatedTenant = impId
      ? { id: impId, companyName: impName || impId }
      : null;
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false, impersonatedTenant });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
