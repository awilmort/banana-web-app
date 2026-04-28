import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, Room, Reservation, MediaItem, ContactMessage, Amenity, EventType } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api$/, '');
  }
})();

export const resolveMediaUrl = (url: string): string =>
  url?.startsWith('http') ? url : `${API_ORIGIN}${url || ''}`;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 429) return Promise.reject(error);
    if (error.response?.status === 401) {
      const publicEndpoints = [
        '/amenities', '/rooms', '/media', '/pricing', '/auth/login',
        '/auth/register', '/auth/forgot-password', '/auth/reset-password',
        '/contact', '/auth/me', '/event-types', '/reservations/public',
      ];
      const requestUrl = error.config?.url || '';
      const isPublic = publicEndpoints.some(ep => requestUrl.includes(ep));
      if (!isPublic && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = `/${document.documentElement.lang || 'es'}/login`;
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─── Auth Service ────────────────────────────────────────────────────────────
export const authService = {
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    apiClient.post<{ success: boolean; user: User; token: string }>('/auth/register', data),
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<{ success: boolean; user: User; token: string }>('/auth/login', credentials),
  logout: () => apiClient.post<ApiResponse>('/auth/logout'),
  getCurrentUser: () => apiClient.get<{ success: boolean; user: User }>('/auth/me'),
  updateProfile: (data: Partial<User>) => apiClient.put<{ success: boolean; user: User }>('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put<ApiResponse>('/auth/change-password', data),
  forgotPassword: (email: string) => apiClient.post<ApiResponse>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post<ApiResponse>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) =>
    apiClient.post<{ success: boolean; message: string; user?: User; token?: string }>('/auth/verify-email', { token }),
  resendVerification: (email: string) => apiClient.post<ApiResponse>('/auth/resend-verification', { email }),
};

// ─── Rooms Service ────────────────────────────────────────────────────────────
export const roomsService = {
  getRooms: (params?: { page?: number; limit?: number; type?: string; available?: boolean }) =>
    apiClient.get<ApiResponse<{ rooms: Room[]; totalPages: number; currentPage: number }>>('/rooms', { params }),
  getRoom: (id: string) => apiClient.get<ApiResponse<Room>>(`/rooms/${id}`),
  checkAvailability: (roomId: string, checkIn: string, checkOut: string) =>
    apiClient.get<ApiResponse<{ available: boolean }>>(`/rooms/${roomId}/availability`, { params: { checkIn, checkOut } }),
  getAvailableRooms: (checkIn: string, checkOut: string) =>
    apiClient.get<ApiResponse<Room[]>>('/rooms/available', { params: { checkIn, checkOut } }),
  getAvailableDates: (startDate: string, endDate: string) =>
    apiClient.get<ApiResponse<{ availableDates: string[]; unavailableDates: string[]; totalActiveRooms: number }>>(
      '/rooms/available-dates', { params: { startDate, endDate } }
    ),
};

// ─── Reservations Service ─────────────────────────────────────────────────────
export const reservationsService = {
  createReservation: (data: {
    type: 'room' | 'daypass' | 'PasaTarde' | 'event';
    roomType?: string;
    checkInDate: string | Date;
    checkOutDate?: string | Date;
    eventType?: string;
    eventDescription?: string;
    expectedAttendees?: number;
    guestName?: { firstName: string; lastName: string };
    guests: number;
    guestDetails: { adults: number; children: number; infants: number };
    contactInfo: { phone: string; email: string; emergencyContact?: string; country?: string };
    services?: Record<string, boolean>;
    specialRequests?: string;
    totalPrice?: number;
    adultPrice?: number;
    childrenPrice?: number;
  }) => apiClient.post<ApiResponse<Reservation>>('/reservations', data),

  getUserReservations: () => apiClient.get<ApiResponse<Reservation[]>>('/reservations'),
  getReservations: (params?: { page?: number; limit?: number; status?: string; type?: string; search?: string; dateFrom?: string; dateTo?: string; sort?: string }) =>
    apiClient.get<{ success: boolean; count: number; data: Reservation[]; pagination?: unknown }>('/reservations', { params }),
  getReservation: (id: string) => apiClient.get<ApiResponse<Reservation>>(`/reservations/${id}`),
  getPublicReservation: (token: string) => apiClient.get<ApiResponse<Reservation>>(`/reservations/public/${token}`),
  getPublicReservationByCode: (code: string) => apiClient.get<ApiResponse<Reservation>>(`/reservations/public/code/${code}`),
  cancelPublicReservation: (token: string, reason?: string) =>
    apiClient.put<ApiResponse<Reservation>>(`/reservations/public/${token}/cancel`, { cancellationReason: reason }),
  cancelPublicReservationByCode: (code: string, reason?: string) =>
    apiClient.put<ApiResponse<Reservation>>(`/reservations/public/code/${code}/cancel`, { cancellationReason: reason }),
  cancelReservation: (id: string) => apiClient.patch<ApiResponse>(`/reservations/${id}/cancel`),
  assignRoom: (reservationId: string, roomId: string | null) =>
    apiClient.put<ApiResponse<Reservation>>(`/reservations/${reservationId}/assign-room`, { roomId }),
  assignRooms: (reservationId: string, roomIds: string[]) =>
    apiClient.put<ApiResponse<Reservation>>(`/reservations/${reservationId}/assign-rooms`, { roomIds }),
  updateReservation: (id: string, data: Partial<{ checkInDate: string | Date; checkOutDate: string | Date; guestDetails: { adults: number; children: number; infants: number }; specialRequests: string; services: Record<string, boolean>; contactInfo: { phone?: string; email?: string; emergencyContact?: string; country?: string }; adultPrice?: number; childrenPrice?: number }>) =>
    apiClient.put<ApiResponse<Reservation>>(`/reservations/${id}`, data),
  deleteReservation: (id: string, reason?: string) =>
    apiClient.delete<ApiResponse>(`/reservations/${id}`, { data: { reason } }),
  updateReservationStatus: (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') =>
    apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/status`, { status }),
  checkInReservation: (id: string, data: { identificationDocument: string; checkInAt?: string }) =>
    apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/check-in`, data),
  checkOutReservation: (id: string, data?: { checkOutAt?: string }) =>
    apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/check-out`, data || {}),
  addReservationPayment: (id: string, data: { amount: number; method?: 'card' | 'cash' | 'transfer'; note?: string }) =>
    apiClient.post<ApiResponse<Reservation>>(`/reservations/${id}/payments`, data),
  updateReservationPayment: (id: string, paymentId: string, data: { amount?: number; method?: 'card' | 'cash' | 'transfer'; note?: string }) =>
    apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/payments/${paymentId}`, data),
  deleteReservationPayment: (id: string, paymentId: string) =>
    apiClient.delete<ApiResponse<Reservation>>(`/reservations/${id}/payments/${paymentId}`),
};

// ─── Amenities Service ────────────────────────────────────────────────────────
export const amenitiesService = {
  getAmenities: (params?: { category?: string; active?: boolean }) =>
    apiClient.get<ApiResponse<Amenity[]>>('/amenities', { params }),
  getAmenity: (id: string) => apiClient.get<ApiResponse<Amenity>>(`/amenities/${id}`),
  createAmenity: (data: { name: string; description: string; imageUrl: string; category: string; order: number; isActive: boolean }) =>
    apiClient.post<ApiResponse<Amenity>>('/amenities', data),
  updateAmenity: (id: string, data: Partial<{ name: string; description: string; imageUrl: string; category: string; order: number; isActive: boolean }>) =>
    apiClient.put<ApiResponse<Amenity>>(`/amenities/${id}`, data),
  deleteAmenity: (id: string) => apiClient.delete<ApiResponse>(`/amenities/${id}`),
  getAllAmenitiesAdmin: (params?: { category?: string; active?: boolean; page?: number; limit?: number; sort?: string }) =>
    apiClient.get<ApiResponse<{ amenities: Amenity[]; totalPages: number; currentPage: number }>>('/amenities', { params }),
};

// ─── Media Service ────────────────────────────────────────────────────────────
export const mediaService = {
  getMedia: (params?: { category?: string; type?: string; featured?: boolean; tags?: string; page?: number; limit?: number; sort?: string }) =>
    apiClient.get<ApiResponse<MediaItem[]>>('/media', { params }),
  uploadMedia: (formData: FormData) =>
    apiClient.post<ApiResponse<MediaItem>>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  updateMedia: (id: string, data: Partial<{ title: string; description: string; category: string; tags: string; isFeatured: boolean; isPublic: boolean }>) =>
    apiClient.put<ApiResponse<MediaItem>>(`/media/${id}`, data),
  deleteMedia: (id: string) => apiClient.delete<ApiResponse>(`/media/${id}`),
  syncUploads: () => apiClient.post<ApiResponse<{ created: number; skipped: number }>>('/media/sync-uploads'),
};

// ─── Contact Service ───────────────────────────────────────────────────────────
export const contactService = {
  sendMessage: (data: { name: string; email: string; phone?: string; subject: string; message: string }) =>
    apiClient.post<ApiResponse<ContactMessage>>('/contact', data),
};

// ─── Event Types Service ───────────────────────────────────────────────────────
export const eventTypesService = {
  getEventTypes: (params?: { active?: boolean }) =>
    apiClient.get<ApiResponse<EventType[]>>('/event-types', { params }),
  getEventType: (id: string) => apiClient.get<ApiResponse<EventType>>(`/event-types/${id}`),
  createEventType: (data: { type: string; title: string; description?: string; features?: string[]; priceFrom: number; maxGuests: number; maxChildren?: number; maxAdults?: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<EventType>>('/event-types', data),
  updateEventType: (id: string, data: Partial<{ type: string; title: string; description?: string; features?: string[]; priceFrom: number; maxGuests: number; maxChildren: number; maxAdults?: number; isActive: boolean }>) =>
    apiClient.put<ApiResponse<EventType>>(`/event-types/${id}`, data),
  deleteEventType: (id: string) => apiClient.delete<ApiResponse>(`/event-types/${id}`),
};

// ─── Pricing Service ───────────────────────────────────────────────────────────
export const pricingService = {
  getPricing: (params?: { service?: string }) =>
    apiClient.get<ApiResponse<unknown[]>>('/pricing', { params }),
  createPricing: (data: { service: 'daypass' | 'pasatarde' | 'hospedaje'; category: 'standard' | 'special'; validity: 'everyday' | 'weekdays' | 'weekend' | 'custom'; startDate?: string | Date; endDate?: string | Date; adultPrice: number; childrenPrice: number; isActive?: boolean }) =>
    apiClient.post<ApiResponse<unknown>>('/pricing', data),
  updatePricing: (id: string, data: Partial<{ service: string; category: string; validity: string; startDate?: string | Date; endDate?: string | Date; adultPrice: number; childrenPrice: number; isActive: boolean }>) =>
    apiClient.put<ApiResponse<unknown>>(`/pricing/${id}`, data),
  deletePricing: (id: string) => apiClient.delete<ApiResponse>(`/pricing/${id}`),
};

// ─── Roles Service (needed by AuthContext) ─────────────────────────────────────
export const rolesService = {
  getRoles: () => apiClient.get<ApiResponse<{ name: string; permissions: string[] }[]>>('/roles'),
  createRole: (data: { name: string; description?: string; permissions: string[] }) =>
    apiClient.post<ApiResponse<unknown>>('/roles', data),
  updateRole: (id: string, data: Partial<{ name: string; description?: string; permissions: string[] }>) =>
    apiClient.put<ApiResponse<unknown>>(`/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.delete<ApiResponse<unknown>>(`/roles/${id}`),
};

// ─── Admin Service ─────────────────────────────────────────────────────────────
export const adminService = {
  getDashboardStats: () => apiClient.get<ApiResponse<unknown>>('/admin/dashboard'),
  getRevenue: (params: { from?: string; to?: string }) => apiClient.get<ApiResponse<unknown>>('/admin/revenue', { params }),
  getCommissions: (params: { from?: string; to?: string; name?: string; email?: string }) => apiClient.get<ApiResponse<unknown>>('/admin/commissions', { params }),

  createRoom: (roomData: Partial<Room>) => apiClient.post<ApiResponse<Room>>('/rooms', roomData),
  updateRoom: (id: string, roomData: Partial<Room>) => apiClient.put<ApiResponse<Room>>(`/rooms/${id}`, roomData),
  updateRoomOps: (id: string, data: { status?: string; condition?: 'pending_cleanup' | 'clean'; comment?: string }) =>
    apiClient.patch<ApiResponse<Room>>(`/rooms/${id}/ops`, data),
  deleteRoom: (id: string) => apiClient.delete<ApiResponse>(`/rooms/${id}`),

  getAllReservations: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get<ApiResponse<{ reservations: Reservation[]; totalPages: number; currentPage: number }>>('/admin/reservations', { params }),
  updateReservationStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<Reservation>>(`/admin/reservations/${id}/status`, { status }),

  createUser: (data: { firstName: string; lastName: string; email: string; phone?: string; role?: string; password: string }) =>
    apiClient.post<ApiResponse<User>>('/admin/users', data),
  updateUser: (id: string, data: Partial<{ firstName: string; lastName: string; email: string; phone?: string; role?: string; isActive?: boolean; emailVerified?: boolean }>) =>
    apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete<ApiResponse>(`/admin/users/${id}`),
  getAllUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    apiClient.get<ApiResponse<{ users: User[]; totalPages: number; currentPage: number }>>('/admin/users', { params }),
  updateUserRole: (id: string, role: string) => apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role }),

  getContactMessages: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<{ messages: ContactMessage[]; totalPages: number; currentPage: number }>>('/admin/contact', { params }),
  updateMessageStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<ContactMessage>>(`/admin/contact/${id}/status`, { status }),
};

// ─── Wristbands Service ────────────────────────────────────────────────────────
export const wristbandsService = {
  createDelivery: (data: { date: string | Date; type: 'delivery' | 'collection'; recipient?: string; counts: { daypassAdults: number; daypassChildren: number; accommodations: number; pasatarde: number }; notes?: string }) =>
    apiClient.post<ApiResponse<unknown>>('/admin/wristbands/deliveries', data),
  getDeliveries: (params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<unknown>>('/admin/wristbands/deliveries', { params }),
  getUsage: (params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<{ accommodations: number; daypassAdults: number; daypassChildren: number; pasatarde: number }>>('/admin/wristbands/usage', { params }),
  updateDelivery: (id: string, data: Partial<{ date: string | Date; type: 'delivery' | 'collection'; recipient: string; counts: { daypassAdults: number; daypassChildren: number; accommodations: number; pasatarde: number }; notes: string }>) =>
    apiClient.put<ApiResponse<unknown>>(`/admin/wristbands/deliveries/${id}`, data),
  deleteDelivery: (id: string) => apiClient.delete<ApiResponse<unknown>>(`/admin/wristbands/deliveries/${id}`),
};

// ─── Guests Service ────────────────────────────────────────────────────────────
export const guestsService = {
  getGuests: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<unknown>>('/guests', { params }),
  getGuest: (id: string) => apiClient.get<ApiResponse<unknown>>(`/guests/${id}`),
  createGuest: (data: { firstName: string; lastName: string; email: string; phone?: string; country?: string; notes?: string }) =>
    apiClient.post<ApiResponse<unknown>>('/guests', data),
  updateGuest: (id: string, data: Partial<{ firstName: string; lastName: string; email: string; phone: string; country: string; notes: string }>) =>
    apiClient.put<ApiResponse<unknown>>(`/guests/${id}`, data),
  deleteGuest: (id: string) => apiClient.delete<ApiResponse>(`/guests/${id}`),
};

export default apiClient;
