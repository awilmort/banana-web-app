import mongoose, { Document, Schema } from 'mongoose';

export interface IReservation extends Document {
  user?: mongoose.Types.ObjectId; // Optional for guest bookings

  // Guest identification (required when user is not logged in)
  guestName?: {
    firstName: string;
    lastName: string;
  };

  // Unique confirmation token for guest access
  confirmationToken?: string;

  // Human-friendly reservation code (e.g., B25AB12)
  reservationCode?: string;

  // Reservation type - determines which fields are required
  type: 'room' | 'daypass' | 'PasaTarde' | 'event';

  // Room-specific fields (required for room reservations)
  room?: mongoose.Types.ObjectId; // Specific room assigned by admin
  roomType?: 'standard' | 'deluxe' | 'suite' | 'villa'; // For compatibility during transition

  // Event-specific fields (required for event reservations)
  eventType?: 'wedding' | 'conference' | 'birthday' | 'corporate' | 'other';
  eventDescription?: string;
  expectedAttendees?: number;

  // Common date fields
  checkInDate: Date;
  checkOutDate?: Date; // Optional for day pass and some events

  // Operational timestamps
  actualCheckInAt?: Date;
  actualCheckOutAt?: Date;

  // Identification document provided at check-in (e.g., ID number or file reference)
  identificationDocument?: string;

  // Guest information
  guests: number;
  guestDetails: {
    adults: number;
    children: number;
    infants: number;
  };

  // Pricing and payment
  adultPrice?: number;
  childrenPrice?: number;
  totalPrice: number;
  totalPayments: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: 'card' | 'cash' | 'transfer';

  // Payment records
  payments?: Array<{
    amount: number;
    method: 'card' | 'cash' | 'transfer';
    note?: string;
    createdAt: Date;
    createdBy?: mongoose.Types.ObjectId;
  }>;

  // Contact and requests
  contactInfo: {
    phone: string;
    email: string;
    emergencyContact?: string;
  };
  specialRequests?: string;

  // Services (optional for all types)
  services?: {
    breakfast?: boolean;
    airportTransfer?: boolean;
    spa?: boolean;
    aquaPark?: boolean;
    catering?: boolean; // For events
    decoration?: boolean; // For events
    photography?: boolean; // For events
    musicSystem?: boolean; // For events
  };

  // Calculated fields
  totalNights?: number; // For room reservations
  totalDays?: number; // For multi-day events

  // Administrative fields
  cancellationReason?: string;
  assignedBy?: mongoose.Types.ObjectId; // Admin who assigned the room/approved event
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for guest bookings
  },

  // Guest identification (required when user is not provided)
  guestName: {
    firstName: {
      type: String,
      required: false,
      trim: true
    },
    lastName: {
      type: String,
      required: false,
      trim: true
    }
  },

  // Unique confirmation token for guest bookings
  confirmationToken: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    // unique implies an index; no need for additional index flag
  },

  // Human-friendly reservation code
  reservationCode: {
    type: String,
    unique: true,
    sparse: true,
    // unique implies an index; no need for additional index flag
  },

  // Reservation type
  type: {
    type: String,
    enum: ['room', 'daypass', 'PasaTarde', 'event'],
    required: true
  },

  // Room-specific fields
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: false // Optional - assigned by admin later for room reservations
  },
  roomType: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'villa'],
    required: false // Only required for room reservations (for compatibility)
  },

  // Event-specific fields
  eventType: {
    type: String,
    enum: ['wedding', 'conference', 'birthday', 'corporate', 'other'],
    required: false // Only required for event reservations
  },
  eventDescription: {
    type: String,
    required: false
  },
  expectedAttendees: {
    type: Number,
    min: 1,
    required: false // Only for events
  },

  // Common date fields
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: false, // Optional for day pass and some events
    validate: {
      validator: function (this: IReservation, value: Date) {
        return !value || value > this.checkInDate;
      },
      message: 'Check-out date must be after check-in date'
    }
  },

  // Operational timestamps
  actualCheckInAt: {
    type: Date,
    required: false
  },
  actualCheckOutAt: {
    type: Date,
    required: false
  },

  identificationDocument: {
    type: String,
    trim: true,
    maxlength: 200,
    required: false
  },

  // Guest information
  guests: {
    type: Number,
    required: true,
    min: 1
  },

  // Pricing and payment
  adultPrice: {
    type: Number,
    required: false,
    min: 0
  },
  childrenPrice: {
    type: Number,
    required: false,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPayments: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'transfer']
  },

  // Payment records
  payments: [
    new Schema({
      amount: { type: Number, required: true, min: 0 },
      method: { type: String, enum: ['card', 'cash', 'transfer'], required: true },
      note: { type: String, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }, { _id: true })
  ],

  // Contact and requests
  specialRequests: {
    type: String,
    maxlength: 1000 // Increased for events
  },
  guestDetails: {
    adults: {
      type: Number,
      required: true,
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    infants: {
      type: Number,
      default: 0,
      min: 0,
      max: 50
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
      // No strict format validation; required but flexible
    },
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    emergencyContact: {
      type: String,
      // No strict format validation
    },
    country: {
      type: String,
      trim: true
    }
  },

  // Services (optional for all types)
  services: {
    breakfast: { type: Boolean, default: false },
    airportTransfer: { type: Boolean, default: false },
    spa: { type: Boolean, default: false },
    aquaPark: { type: Boolean, default: false },
    // Event-specific services
    catering: { type: Boolean, default: false },
    decoration: { type: Boolean, default: false },
    photography: { type: Boolean, default: false },
    musicSystem: { type: Boolean, default: false }
  },

  // Calculated fields
  totalNights: {
    type: Number,
    min: 0 // Optional field, calculated for room reservations
  },
  totalDays: {
    type: Number,
    min: 1 // For multi-day events
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate total nights/days and validate based on type
reservationSchema.pre('save', function (next) {
  // Calculate totalNights for room reservations
  if (this.type === 'room' && this.checkInDate && this.checkOutDate) {
    const timeDiff = this.checkOutDate.getTime() - this.checkInDate.getTime();
    this.totalNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Calculate totalDays for events (or set to 1 for single-day events)
  if (this.type === 'event') {
    if (this.checkInDate && this.checkOutDate) {
      const timeDiff = this.checkOutDate.getTime() - this.checkInDate.getTime();
      this.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end days
    } else {
      this.totalDays = 1; // Single-day event
    }
  }

  // For day pass and PasaTarde, no additional calculations needed
  if (this.type === 'daypass' || this.type === 'PasaTarde') {
    this.totalNights = 0;
    this.totalDays = 1;
  }

  // Type-specific validations
  // Room type is optional; admin assigns specific room later.

  if (this.type === 'event' && !this.eventType) {
    return next(new Error('Event type is required for event reservations'));
  }

  if (this.type === 'room' && !this.checkOutDate) {
    return next(new Error('Check-out date is required for room reservations'));
  }
  next();
});

// Index for efficient queries
reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ checkInDate: 1, checkOutDate: 1 });
reservationSchema.index({ actualCheckInAt: 1 });
reservationSchema.index({ actualCheckOutAt: 1 });
// reservationCode already has a unique index via field definition; avoid duplicate index

export default mongoose.model<IReservation>('Reservation', reservationSchema);
