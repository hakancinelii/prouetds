import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Railway Production URL
const BASE_URL = 'https://prouetds-production.up.railway.app';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: Handle expired tokens
client.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  if (error.response?.status === 401) {
    // If token expired, clear it and user should relogin
    // In a real scenario, we could use a refresh token
    await SecureStore.deleteItemAsync('accessToken');
  }
  return Promise.reject(error);
});

export default client;

export const api = {
  login: (email: string, pass: string) => client.post('/api/auth/login', { email, password: pass }),
  getTrips: () => client.get('/api/trips/driver/my-trips'),
  getTripDetail: (id: string) => client.get(`/api/trips/${id}`),
  addPassenger: (groupId: string, data: any) => client.post(`/api/trips/groups/${groupId}/passengers`, data),
  sendToUetds: (tripId: string) => client.post(`/api/trips/${tripId}/send-to-uetds`),
  getPdf: (tripId: string) => client.get(`/api/trips/${tripId}/pdf`, { responseType: 'blob' }),
};
