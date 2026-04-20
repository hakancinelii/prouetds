import axios from 'axios';

// Updated to point to the new Railway backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
};

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && !isAuthEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const originalRequest = error.config || {};

      if (isAuthEndpoint(originalRequest.url) || originalRequest._retry) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          originalRequest._retry = true;
          const res = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', res.data.accessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const isStoredSessionPresent = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
};

export const resetAuthSession = () => {
  clearAuthStorage();
};

export default api;

// API helper functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  demoLogin: () => api.post('/api/auth/login', {
    email: 'demo@prouetds.com',
    password: 'Demo123!',
  }),
  register: (data: any) =>
    api.post('/api/auth/register', data),
  refresh: (token: string) =>
    api.post('/api/auth/refresh', { refreshToken: token }),
};

export const tripsApi = {
  list: (params?: any) => api.get('/api/trips', { params }),
  get: (id: string) => api.get(`/api/trips/${id}`),
  create: (data: any) => api.post('/api/trips', data),
  update: (id: string, data: any) => api.patch(`/api/trips/${id}`, data),
  addGroup: (tripId: string, data: any) =>
    api.post(`/api/trips/${tripId}/groups`, data),
  addPersonnel: (tripId: string, data: any) =>
    api.post(`/api/trips/${tripId}/personnel`, data),
  addPassenger: (groupId: string, data: any) =>
    api.post(`/api/trips/groups/${groupId}/passengers`, data),
  addPassengersBulk: (groupId: string, passengers: any[]) =>
    api.post(`/api/trips/groups/${groupId}/passengers/bulk`, { passengers }),
  parseText: (groupId: string, text: string) =>
    api.post(`/api/trips/groups/${groupId}/passengers/parse-text`, { text }),
  parseExcel: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/trips/groups/${groupId}/passengers/parse-excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  parsePassport: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/api/trips/groups/${groupId}/passengers/parse-passport`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  sendToUetds: (tripId: string) =>
    api.post(`/api/trips/${tripId}/send-to-uetds`),
  cancel: (tripId: string, reason: string) =>
    api.post(`/api/trips/${tripId}/cancel`, { reason }),
  getSummary: (tripId: string) => api.get(`/api/trips/${tripId}/summary`),
  getPdf: (tripId: string, options?: { download?: boolean }) =>
    api.get(`/api/trips/${tripId}/pdf`, {
      responseType: 'blob',
      params: options?.download ? { download: '1' } : undefined,
    }),
};

export const driversApi = {
  list: () => api.get('/api/drivers'),
  get: (id: string) => api.get(`/api/drivers/${id}`),
  create: (data: any) => api.post('/api/drivers', data),
  update: (id: string, data: any) => api.patch(`/api/drivers/${id}`, data),
  remove: (id: string) => api.delete(`/api/drivers/${id}`),
};

export const vehiclesApi = {
  list: () => api.get('/api/vehicles'),
  get: (id: string) => api.get(`/api/vehicles/${id}`),
  create: (data: any) => api.post('/api/vehicles', data),
  bulkCreate: (text: string) => api.post('/api/vehicles/bulk', { text }),
  update: (id: string, data: any) => api.patch(`/api/vehicles/${id}`, data),
  remove: (id: string) => api.delete(`/api/vehicles/${id}`),
};

export const uetdsApi = {
  test: () => api.get('/api/uetds/test'),
  validate: () => api.get('/api/uetds/validate-credentials'),
  checkVehicleEligibility: (plate: string) =>
    api.get('/api/uetds/vehicle/eligibility', { params: { plate } }),
  checkVehicleInspection: (plate: string) =>
    api.get('/api/uetds/vehicle/inspection', { params: { plate } }),
  checkDriverQualification: (tcKimlikNo: string) =>
    api.get('/api/uetds/driver/qualification', { params: { tcKimlikNo } }),
  verifyIdentity: (tcKimlikNo: string, firstName: string, lastName: string) =>
    api.get('/api/uetds/driver/identity', {
      params: { tcKimlikNo, firstName, lastName },
    }),
};

export const tenantsApi = {
  list: (params?: any) => api.get('/api/tenants', { params }),
  get: (id: string) => api.get(`/api/tenants/${id}`),
  create: (data: any) => api.post('/api/tenants', data),
  update: (id: string, data: any) => api.patch(`/api/tenants/${id}`, data),
  toggleActive: (id: string) => api.post(`/api/tenants/${id}/toggle-active`),
};

export const usersApi = {
  list: (tenantId?: string) => api.get('/api/users', { params: tenantId ? { tenantId } : undefined }),
  createDriver: (data: any, tenantId?: string) =>
    api.post('/api/users/driver', data, { params: tenantId ? { tenantId } : undefined }),
  update: (id: string, data: any, tenantId?: string) =>
    api.patch(`/api/users/${id}`, data, { params: tenantId ? { tenantId } : undefined }),
  toggleActive: (id: string, tenantId?: string) =>
    api.post(`/api/users/${id}/toggle-active`, {}, { params: tenantId ? { tenantId } : undefined }),
};

export const logsApi = {
  getUetdsLogs: (params?: any) => api.get('/api/logs/uetds', { params }),
  getTripLogs: (tripId: string) => api.get(`/api/logs/uetds/trip/${tripId}`),
  getAuditLogs: (params?: any) => api.get('/api/logs/audit', { params }),
  getStats: () => api.get('/api/logs/stats'),
};
