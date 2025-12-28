import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  description: string;
  type: 'standard' | 'deluxe' | 'suite' | 'villa';
  amenities: string[];
  images: string[];
  status: 'not_available' | 'available' | 'booked' | 'occupied';
  condition: 'pending_cleanup' | 'clean';
  comment?: string;
  features: {
    wifi: boolean;
    airConditioning: boolean;
    miniBar: boolean;
    balcony: boolean;
    oceanView: boolean;
    kitchenette: boolean;
    jacuzzi: boolean;
  };
  bedConfiguration: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'villa'],
    required: true
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['not_available', 'available', 'booked', 'occupied'],
    default: 'available'
  },
  condition: {
    type: String,
    enum: ['pending_cleanup', 'clean'],
    default: 'clean'
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  features: {
    wifi: { type: Boolean, default: true },
    airConditioning: { type: Boolean, default: true },
    miniBar: { type: Boolean, default: false },
    balcony: { type: Boolean, default: false },
    oceanView: { type: Boolean, default: false },
    kitchenette: { type: Boolean, default: false },
    jacuzzi: { type: Boolean, default: false }
  },
  bedConfiguration: {
    type: String,
    required: true,
    maxlength: 100
  }
}, {
  timestamps: true
});

// Index for searching
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ condition: 1 });

// Normalize legacy condition values before saving
// Legacy normalization removed: only 'pending_cleanup' or 'clean' are valid
// No automatic mapping from deprecated values.

export default mongoose.model<IRoom>('Room', roomSchema);
