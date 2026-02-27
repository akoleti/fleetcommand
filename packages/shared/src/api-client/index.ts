/**
 * Shared API Client — FleetCommand
 * 
 * Used by both web (Next.js) and mobile (React Native) apps
 * Handles HTTP requests, token management, and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Truck,
  Trip,
  Driver,
  Alert,
  DeliveryProof,
  FuelLog,
  MaintenanceLog,
  TruckInsurance,
} from '../types/index';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     process.env.EXPO_PUBLIC_API_URL ||
                     'https://fleetcommand.vercel.app';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<() => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      withCredentials: true,
    });

    // Request interceptor: add auth token
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor: handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 and we haven't refreshed yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            originalRequest._retry = true;

            try {
              const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
                `${API_BASE_URL}/api/auth/refresh`,
                { refreshToken: this.refreshToken },
              );

              this.setTokens(data.accessToken, data.refreshToken);
              this.isRefreshing = false;

              // Retry original request
              return this.client(originalRequest);
            } catch (refreshError) {
              this.isRefreshing = false;
              this.clearTokens();
              throw refreshError;
            }
          }

          // Wait for refresh to complete
          return new Promise((resolve) => {
            this.onRefreshed(() => {
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              resolve(this.client(originalRequest));
            });
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Token Management
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  private onRefreshed(callback: () => void) {
    this.refreshSubscribers.push(callback);
  }

  // ============ Auth Endpoints ============

  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', {
      email,
      password,
    });
    return data;
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    const { data } = await this.client.post('/api/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    return data;
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const { data } = await this.client.post('/api/auth/refresh', {
      refreshToken,
    });
    return data;
  }

  async getCurrentUser() {
    const { data } = await this.client.get<User>('/api/auth/me');
    return data;
  }

  // ============ Trucks Endpoints ============

  async getTrucks(params?: { status?: string; assignedDriverId?: string }) {
    const { data } = await this.client.get('/api/trucks', { params });
    return data;
  }

  async getTruckById(id: string) {
    const { data } = await this.client.get<Truck>(`/api/trucks/${id}`);
    return data;
  }

  async createTruck(payload: any) {
    const { data } = await this.client.post<Truck>('/api/trucks', payload);
    return data;
  }

  async updateTruck(id: string, payload: any) {
    const { data } = await this.client.put<Truck>(`/api/trucks/${id}`, payload);
    return data;
  }

  async deleteTruck(id: string) {
    await this.client.delete(`/api/trucks/${id}`);
  }

  // ============ Drivers Endpoints ============

  async getDrivers(params?: { search?: string }) {
    const { data } = await this.client.get('/api/drivers', { params });
    return data;
  }

  async getDriverById(id: string) {
    const { data } = await this.client.get(`/api/drivers/${id}`);
    return data;
  }

  async createDriver(payload: any) {
    const { data } = await this.client.post('/api/drivers', payload);
    return data;
  }

  async updateDriver(id: string, payload: any) {
    const { data } = await this.client.put(`/api/drivers/${id}`, payload);
    return data;
  }

  // ============ Trips Endpoints ============

  async getTrips(params?: { status?: string; truckId?: string; driverId?: string }) {
    const { data } = await this.client.get('/api/trips', { params });
    return data;
  }

  async getTripById(id: string) {
    const { data } = await this.client.get<Trip>(`/api/trips/${id}`);
    return data;
  }

  async createTrip(payload: any) {
    const { data } = await this.client.post<Trip>('/api/trips', payload);
    return data;
  }

  async updateTrip(id: string, payload: any) {
    const { data } = await this.client.put<Trip>(`/api/trips/${id}`, payload);
    return data;
  }

  async updateTripStatus(id: string, status: string) {
    const { data } = await this.client.patch<Trip>(`/api/trips/${id}/status`, {
      status,
    });
    return data;
  }

  // ============ GPS Endpoints ============

  async pingGps(payload: any) {
    const { data } = await this.client.post('/api/gps/ping', payload);
    return data;
  }

  async getNearestTrucks(latitude: number, longitude: number, radiusKm: number = 10) {
    const { data } = await this.client.get('/api/gps/nearest', {
      params: { latitude, longitude, radiusKm },
    });
    return data;
  }

  async getFleetStatus() {
    const { data } = await this.client.get('/api/gps/fleet-status');
    return data;
  }

  // ============ Alerts Endpoints ============

  async getAlerts(params?: { status?: string; severity?: string; type?: string }) {
    const { data } = await this.client.get('/api/alerts', { params });
    return data;
  }

  async getAlertById(id: string) {
    const { data } = await this.client.get<Alert>(`/api/alerts/${id}`);
    return data;
  }

  async resolveAlert(id: string) {
    const { data } = await this.client.patch<Alert>(`/api/alerts/${id}/resolve`);
    return data;
  }

  async dismissAlert(id: string) {
    const { data } = await this.client.patch<Alert>(`/api/alerts/${id}/dismiss`);
    return data;
  }

  // ============ Maintenance Endpoints ============

  async getMaintenanceLogs(truckId: string) {
    const { data } = await this.client.get('/api/maintenance', {
      params: { truckId },
    });
    return data;
  }

  async createMaintenanceLog(payload: any) {
    const { data } = await this.client.post<MaintenanceLog>('/api/maintenance', payload);
    return data;
  }

  // ============ Insurance Endpoints ============

  async getTruckInsurance(truckId: string) {
    const { data } = await this.client.get('/api/insurance', {
      params: { truckId },
    });
    return data;
  }

  async createInsurancePolicy(payload: any) {
    const { data } = await this.client.post<TruckInsurance>('/api/insurance', payload);
    return data;
  }

  async updateInsurancePolicy(id: string, payload: any) {
    const { data } = await this.client.put<TruckInsurance>(`/api/insurance/${id}`, payload);
    return data;
  }

  // ============ Fuel Endpoints ============

  async getFuelLogs(params?: { truckId?: string; tripId?: string }) {
    const { data } = await this.client.get('/api/fuel', { params });
    return data;
  }

  async createFuelLog(payload: any) {
    const { data } = await this.client.post<FuelLog>('/api/fuel', payload);
    return data;
  }

  // ============ Delivery Endpoints ============

  async getDeliveryProofs(params?: { tripId?: string; status?: string }) {
    const { data } = await this.client.get('/api/delivery', { params });
    return data;
  }

  async getDeliveryProofById(id: string) {
    const { data } = await this.client.get<DeliveryProof>(`/api/delivery/${id}`);
    return data;
  }

  async createDeliveryProof(payload: FormData | any) {
    const { data } = await this.client.post<DeliveryProof>('/api/delivery', payload, {
      headers: {
        'Content-Type': payload instanceof FormData ? 'multipart/form-data' : 'application/json',
      },
    });
    return data;
  }

  // ============ Presigned URL Endpoints ============

  async getS3UploadUrl(fileName: string, fileType: string) {
    const { data } = await this.client.post('/api/s3/upload-url', {
      fileName,
      fileType,
    });
    return data; // { uploadUrl, fileUrl }
  }

  // ============ Error Handling ============

  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for dependency injection if needed
export { ApiClient };
