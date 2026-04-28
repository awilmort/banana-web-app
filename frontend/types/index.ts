export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  _id: string;
  name: string;
  type: 'standard' | 'deluxe' | 'suite' | 'villa';
  description: string;
  amenities: string[];
  bedConfiguration: string;
  images: string[];
  status: 'active' | 'inactive';
  condition: 'pending_cleanup' | 'clean';
  comment?: string;
  features?: {
    wifi: boolean;
    airConditioning: boolean;
    miniBar: boolean;
    balcony: boolean;
    oceanView: boolean;
    kitchenette: boolean;
    jacuzzi: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id?: string;
  amount: number;
  method: 'card' | 'cash' | 'transfer';
  note?: string;
  createdAt: string;
  createdBy?: string | User;
}

export interface Reservation {
  _id: string;
  reservationCode?: string;
  user?: string | User;
  guestName?: { firstName: string; lastName: string };
  confirmationToken?: string;
  type: 'room' | 'daypass' | 'PasaTarde' | 'event';
  room?: string | Room;
  rooms?: Array<string | Room>;
  roomType?: 'standard' | 'deluxe' | 'suite' | 'villa';
  eventType?: string;
  eventDescription?: string;
  expectedAttendees?: number;
  checkInDate: string;
  checkOutDate?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  identificationDocument?: string;
  guests: number;
  guestDetails: { adults: number; children: number; infants: number };
  adultPrice?: number;
  childrenPrice?: number;
  totalPrice: number;
  totalPayments?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentMethod?: string;
  payments?: Payment[];
  contactInfo: {
    phone: string;
    email: string;
    emergencyContact?: string;
    country?: string;
  };
  specialRequests?: string;
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
  totalNights?: number;
  totalDays?: number;
  assignedBy?: string | User;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  _id: string;
  title: string;
  description?: string;
  url: string;
  type: 'image' | 'video';
  category: string;
  isPublic: boolean;
  isFeatured: boolean;
  tags: string[];
  uploadedBy: string | { _id: string; firstName: string; lastName: string };
  fileSize: number;
  dimensions?: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'replied' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  category: 'accommodation' | 'dining' | 'recreation' | 'wellness' | 'business' | 'general';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventType {
  _id: string;
  type: string;
  title: string;
  description?: string;
  features: string[];
  priceFrom: number;
  maxGuests: number;
  maxChildren: number;
  maxAdults?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

export interface WristbandDelivery {
  _id: string;
  date: string;
  type: 'delivery' | 'collection';
  deliveredBy?: string | User;
  recipient?: string;
  counts: {
    daypassAdults: number;
    daypassChildren: number;
    accommodations: number;
    pasatarde: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalRooms: number;
  totalReservations: number;
  totalUsers: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

export interface RevenueData {
  period: string;
  totalRevenue: number;
  reservationCount: number;
  averageTicket: number;
}

export interface CommissionData {
  agentName: string;
  agentEmail: string;
  reservationCount: number;
  totalRevenue: number;
  commission: number;
}
