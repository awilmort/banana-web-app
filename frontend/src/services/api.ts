import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, Room, Reservation, MediaItem, ContactMessage, Amenity, EventType } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
// Derive the API origin to resolve file URLs like /uploads/xxx
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api$/, '');
  }
})();

// Resolve relative media URLs (e.g., /uploads/xyz) against backend origin
export const resolveMediaUrl = (url: string): string =>
  url?.startsWith('http') ? url : `${API_ORIGIN}${url || ''}`;

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common responses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Gracefully handle rate limiting without forcing logout
    if (error.response?.status === 429) {
      const msg = error.response?.data?.message || 'Too many requests. Please try again later.';
      // Surface to UI if available; avoid clearing auth token
      if (typeof window !== 'undefined' && (window as any).toast?.error) {
        (window as any).toast.error(msg);
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      // List of public endpoints that don't require authentication
      const publicEndpoints = [
        '/amenities',
        '/rooms',
        '/media',
        '/pricing',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/contact',
        // Do not force logout on auth check endpoint while on public pages
        '/auth/me'
      ];

      const requestUrl = error.config?.url || '';
      const isPublicEndpoint = publicEndpoints.some(endpoint => requestUrl.includes(endpoint));

      // Only redirect to login if it's not a public endpoint
      if (!isPublicEndpoint) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Response wrapper interface
export interface ApiResponse<T = any> {
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

// Auth Service
export const authService = {
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AxiosResponse<{ success: boolean; message: string; user: User; token: string }>> =>
    apiClient.post('/auth/register', userData),

  login: (credentials: {
    email: string;
    password: string;
  }): Promise<AxiosResponse<{ success: boolean; message: string; user: User; token: string }>> =>
    apiClient.post('/auth/login', credentials),

  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.post('/auth/logout'),

  getCurrentUser: (): Promise<AxiosResponse<{ success: boolean; user: User }>> =>
    apiClient.get('/auth/me'),

  updateProfile: (data: Partial<{ firstName: string; lastName: string; phone?: string; email?: string }>): Promise<AxiosResponse<{ success: boolean; message: string; user: User }>> =>
    apiClient.put('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    apiClient.put('/auth/change-password', data),

  forgotPassword: (email: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string): Promise<AxiosResponse<{ success: boolean; message: string; user?: User; token?: string }>> =>
    apiClient.post('/auth/verify-email', { token }),

  resendVerification: (email: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    apiClient.post('/auth/resend-verification', { email }),
};

// Rooms Service
export const roomsService = {
  getRooms: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    available?: boolean;
  }): Promise<AxiosResponse<ApiResponse<{ rooms: Room[]; totalPages: number; currentPage: number }>>> =>
    apiClient.get('/rooms', { params }),

  getRoom: (id: string): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.get(`/rooms/${id}`),

  checkAvailability: (roomId: string, checkIn: string, checkOut: string): Promise<AxiosResponse<ApiResponse<{ available: boolean }>>> =>
    apiClient.get(`/rooms/${roomId}/availability`, { params: { checkIn, checkOut } }),

  getAvailableRooms: (checkIn: string, checkOut: string): Promise<AxiosResponse<ApiResponse<Room[]>>> =>
    apiClient.get('/rooms/available', { params: { checkIn, checkOut } }),

  getAvailableDates: (startDate: string, endDate: string): Promise<AxiosResponse<ApiResponse<{ availableDates: string[]; unavailableDates: string[]; totalActiveRooms: number }>>> =>
    apiClient.get('/rooms/available-dates', { params: { startDate, endDate } }),

};

// Reservations Service
export const reservationsService = {
  createReservation: (reservationData: {
    type: 'room' | 'daypass' | 'PasaTarde' | 'event';
    // Room-specific fields
    roomType?: string;
    checkOutDate?: string | Date;
    // Event-specific fields
    eventType?: string;
    eventDescription?: string;
    expectedAttendees?: number;
    // Guest information (required for non-authenticated bookings)
    guestName?: {
      firstName: string;
      lastName: string;
    };
    // Common fields
    checkInDate: string | Date;
    guests: number;
    guestDetails: {
      adults: number;
      children: number;
      infants: number;
    };
    contactInfo: {
      phone: string;
      email: string;
      emergencyContact?: string;
      country?: string;
    };
    services?: {
      breakfast?: boolean;
      airportTransfer?: boolean;
      spa?: boolean;
      aquaPark?: boolean;
      catering?: boolean;
      decoration?: boolean;
      photography?: boolean;
      musicSystem?: boolean;
    };
    specialRequests?: string;
    totalPrice?: number;
  }): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.post('/reservations', reservationData),

  getUserReservations: (): Promise<AxiosResponse<ApiResponse<Reservation[]>>> =>
    apiClient.get('/reservations'),

  getReservations: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: 'room' | 'daypass' | 'PasaTarde' | 'event';
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }): Promise<AxiosResponse<{ success: boolean; count: number; data: Reservation[]; pagination?: any }>> =>
    apiClient.get('/reservations', { params }),

  getReservation: (id: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.get(`/reservations/${id}`),

  // Public endpoints for guest access
  getPublicReservation: (confirmationToken: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.get(`/reservations/public/${confirmationToken}`),

  getPublicReservationByCode: (reservationCode: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.get(`/reservations/public/code/${reservationCode}`),

  cancelPublicReservation: (confirmationToken: string, cancellationReason?: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/public/${confirmationToken}/cancel`, { cancellationReason }),

  cancelPublicReservationByCode: (reservationCode: string, cancellationReason?: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/public/code/${reservationCode}/cancel`, { cancellationReason }),

  cancelReservation: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.patch(`/reservations/${id}/cancel`),

  assignRoom: (reservationId: string, roomId: string | null): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${reservationId}/assign-room`, { roomId }),

  assignRooms: (reservationId: string, roomIds: string[]): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${reservationId}/assign-rooms`, { roomIds }),

  updateReservation: (id: string, data: Partial<{
    checkInDate: string | Date;
    checkOutDate: string | Date;
    guestDetails: {
      adults: number;
      children: number;
      infants: number;
    };
    specialRequests: string;
    services: {
      breakfast?: boolean;
      airportTransfer?: boolean;
      spa?: boolean;
      aquaPark?: boolean;
    };
    contactInfo: {
      phone?: string;
      email?: string;
      emergencyContact?: string;
      country?: string;
    };
    adultPrice?: number; // admin only
    childrenPrice?: number; // admin only
  }>): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${id}`, data),

  deleteReservation: (id: string, reason?: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/reservations/${id}`, { data: { reason } }),

  updateReservationStatus: (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed'): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.patch(`/reservations/${id}/status`, { status }),

  // Operational actions
  checkInReservation: (id: string, data: { identificationDocument: string; checkInAt?: string }): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.patch(`/reservations/${id}/check-in`, data),
  checkOutReservation: (id: string, data?: { checkOutAt?: string }): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.patch(`/reservations/${id}/check-out`, data || {}),

  // Payments
  addReservationPayment: (id: string, data: { amount: number; method?: 'card' | 'cash' | 'transfer'; note?: string }): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.post(`/reservations/${id}/payments`, data),

  updateReservationPayment: (id: string, paymentId: string, data: { amount?: number; method?: 'card' | 'cash' | 'transfer'; note?: string }): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.patch(`/reservations/${id}/payments/${paymentId}`, data),

  deleteReservationPayment: (id: string, paymentId: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.delete(`/reservations/${id}/payments/${paymentId}`),
};

// Amenities Service
export const amenitiesService = {
  getAmenities: (params?: {
    category?: string;
    active?: boolean;
  }): Promise<AxiosResponse<ApiResponse<Amenity[]>>> =>
    apiClient.get('/amenities', { params }),

  getAmenity: (id: string): Promise<AxiosResponse<ApiResponse<Amenity>>> =>
    apiClient.get(`/amenities/${id}`),

  createAmenity: (amenityData: {
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    order: number;
    isActive: boolean;
  }): Promise<AxiosResponse<ApiResponse<Amenity>>> =>
    apiClient.post('/amenities', amenityData),

  updateAmenity: (id: string, amenityData: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    order: number;
    isActive: boolean;
  }>): Promise<AxiosResponse<ApiResponse<Amenity>>> =>
    apiClient.put(`/amenities/${id}`, amenityData),

  deleteAmenity: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/amenities/${id}`),

  getAllAmenitiesAdmin: (params?: {
    category?: string;
    active?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<AxiosResponse<ApiResponse<{ amenities: Amenity[]; totalPages: number; currentPage: number }>>> =>
    apiClient.get('/amenities', { params }),
};

// Media Service
export const mediaService = {
  getMedia: (params?: {
    category?: string;
    type?: string;
    featured?: boolean;
    tags?: string; // comma-separated
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<AxiosResponse<ApiResponse<MediaItem[]>>> =>
    apiClient.get('/media', { params }),

  uploadMedia: (formData: FormData): Promise<AxiosResponse<ApiResponse<MediaItem>>> =>
    apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // allow up to 60s in production to avoid timeouts
    }),

  updateMedia: (id: string, data: Partial<{
    title: string;
    description: string;
    category: string;
    tags: string; // comma-separated
    isFeatured: boolean;
    isPublic: boolean;
  }>): Promise<AxiosResponse<ApiResponse<MediaItem>>> =>
    apiClient.put(`/media/${id}`, data),

  deleteMedia: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/media/${id}`),

  syncUploads: (): Promise<AxiosResponse<ApiResponse<{ created: number; skipped: number }>>> =>
    apiClient.post('/media/sync-uploads'),
};

// Contact Service
export const contactService = {
  sendMessage: (messageData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<AxiosResponse<ApiResponse<ContactMessage>>> =>
    apiClient.post('/contact', messageData),
};

// Event Types Service
export const eventTypesService = {
  getEventTypes: (params?: { active?: boolean }): Promise<AxiosResponse<ApiResponse<EventType[]>>> =>
    apiClient.get('/event-types', { params }),

  getEventType: (id: string): Promise<AxiosResponse<ApiResponse<EventType>>> =>
    apiClient.get(`/event-types/${id}`),

  createEventType: (data: {
    type: string;
    title: string;
    description?: string;
    features?: string[];
    priceFrom: number;
    maxGuests: number;
    maxChildren?: number;
    maxAdults?: number;
    isActive?: boolean;
  }): Promise<AxiosResponse<ApiResponse<EventType>>> =>
    apiClient.post('/event-types', data),

  updateEventType: (id: string, data: Partial<{
    type: string;
    title: string;
    description?: string;
    features?: string[];
    priceFrom: number;
    maxGuests: number;
    maxChildren: number;
    maxAdults?: number;
    isActive: boolean;
  }>): Promise<AxiosResponse<ApiResponse<EventType>>> =>
    apiClient.put(`/event-types/${id}`, data),

  deleteEventType: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/event-types/${id}`)
};

// Admin Services
export const adminService = {
  // Dashboard stats
  getDashboardStats: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/dashboard'),
  // Revenue
  getRevenue: (params: { from?: string; to?: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/revenue', { params }),
  // Commissions (salesman stats)
  getCommissions: (params: { from?: string; to?: string; name?: string; email?: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/commissions', { params }),

  // Room management - using correct room routes
  createRoom: (roomData: Partial<Room>): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.post('/rooms', roomData),

  updateRoom: (id: string, roomData: Partial<Room>): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.put(`/rooms/${id}`, roomData),
  updateRoomOps: (id: string, data: {
    status?: 'not_available' | 'available' | 'booked' | 'occupied';
    condition?: 'pending_cleanup' | 'clean';
    comment?: string;
  }): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.patch(`/rooms/${id}/ops`, data),

  deleteRoom: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/rooms/${id}`),

  // Reservation management
  getAllReservations: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AxiosResponse<ApiResponse<{ reservations: Reservation[]; totalPages: number; currentPage: number }>>> =>
    apiClient.get('/admin/reservations', { params }),

  updateReservationStatus: (id: string, status: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.patch(`/admin/reservations/${id}/status`, { status }),

  // User CRUD
  createUser: (data: { firstName: string; lastName: string; email: string; phone?: string; role?: string; password: string }): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.post('/admin/users', data),
  updateUser: (id: string, data: Partial<{ firstName: string; lastName: string; email: string; phone?: string; role?: string; isActive?: boolean; emailVerified?: boolean }>): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/admin/users/${id}`),

  // User management
  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
  }): Promise<AxiosResponse<ApiResponse<{ users: User[]; totalPages: number; currentPage: number }>>> =>
    apiClient.get('/admin/users', { params }),

  updateUserRole: (id: string, role: string): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.patch(`/admin/users/${id}/role`, { role }),

  // Contact messages
  getContactMessages: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<AxiosResponse<ApiResponse<{ messages: ContactMessage[]; totalPages: number; currentPage: number }>>> =>
    apiClient.get('/admin/contact', { params }),

  updateMessageStatus: (id: string, status: string): Promise<AxiosResponse<ApiResponse<ContactMessage>>> =>
    apiClient.patch(`/admin/contact/${id}/status`, { status }),
};

// Wristbands Service
export const wristbandsService = {
  createDelivery: (data: {
    date: string | Date;
    type: 'delivery' | 'collection';
    recipient?: string;
    counts: { daypassAdults: number; daypassChildren: number; accommodations: number; pasatarde: number };
    notes?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.post('/admin/wristbands/deliveries', data),

  getDeliveries: (params?: { from?: string; to?: string }): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.get('/admin/wristbands/deliveries', { params }),

  getUsage: (params?: { from?: string; to?: string }): Promise<AxiosResponse<ApiResponse<{ accommodations: number; daypassAdults: number; daypassChildren: number; pasatarde: number }>>> =>
    apiClient.get('/admin/wristbands/usage', { params }),

  updateDelivery: (id: string, data: Partial<{
    date: string | Date;
    type: 'delivery' | 'collection';
    recipient: string;
    counts: { daypassAdults: number; daypassChildren: number; accommodations: number; pasatarde: number };
    notes: string;
  }>): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.put(`/admin/wristbands/deliveries/${id}`, data),

  deleteDelivery: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.delete(`/admin/wristbands/deliveries/${id}`),
};
// Roles Service
export const rolesService = {
  getRoles: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/roles'),
  createRole: (data: { name: string; description?: string; permissions: string[] }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/roles', data),
  updateRole: (id: string, data: Partial<{ name: string; description?: string; permissions: string[] }>): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/roles/${id}`, data),
  deleteRole: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/roles/${id}`),
};

export default apiClient;

// Pricing Service
export const pricingService = {
  getPricing: (params?: { service?: 'daypass' | 'pasatarde' | 'hospedaje'; category?: 'standard' | 'special'; }): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/pricing', { params }),

  createPricing: (data: {
    service: 'daypass' | 'pasatarde' | 'hospedaje';
    category: 'standard' | 'special';
    validity: 'everyday' | 'weekdays' | 'weekend' | 'custom';
    startDate?: string | Date;
    endDate?: string | Date;
    adultPrice: number;
    childrenPrice: number;
    isActive?: boolean;
  }): Promise<AxiosResponse<ApiResponse<any>>> => apiClient.post('/pricing', data),

  updatePricing: (id: string, data: Partial<{
    service: 'daypass' | 'pasatarde' | 'hospedaje';
    category: 'standard' | 'special';
    validity: 'everyday' | 'weekdays' | 'weekend' | 'custom';
    startDate?: string | Date;
    endDate?: string | Date;
    adultPrice: number;
    childrenPrice: number;
    isActive: boolean;
  }>): Promise<AxiosResponse<ApiResponse<any>>> => apiClient.put(`/pricing/${id}`, data),

  deletePricing: (id: string): Promise<AxiosResponse<ApiResponse>> => apiClient.delete(`/pricing/${id}`)
};
