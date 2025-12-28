import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  category: 'general' | 'reservation' | 'complaint' | 'suggestion' | 'technical';
  respondedBy?: mongoose.Types.ObjectId;
  response?: string;
  responseDate?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    // No strict format validation; optional field
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'resolved'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['general', 'reservation', 'complaint', 'suggestion', 'technical'],
    default: 'general'
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    type: String,
    maxlength: 2000
  },
  responseDate: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ category: 1 });
contactSchema.index({ priority: 1, status: 1 });
contactSchema.index({ email: 1 });

export default mongoose.model<IContact>('Contact', contactSchema);
