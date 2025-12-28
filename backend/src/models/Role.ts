import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string; // e.g., 'admin', 'customer', 'maintenance', 'staff'
  description?: string;
  permissions: string[]; // e.g., ['admin.access', 'accommodations.manage', 'schedule.view']
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 50,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  permissions: [{ type: String, trim: true }]
}, { timestamps: true });

roleSchema.index({ name: 1 });

export default mongoose.model<IRole>('Role', roleSchema);
