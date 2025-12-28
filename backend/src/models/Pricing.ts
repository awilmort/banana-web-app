import mongoose, { Document, Schema } from 'mongoose';

export type PricingService = 'daypass' | 'pasatarde' | 'hospedaje';
export type PricingCategory = 'standard' | 'special';
export type PricingValidity = 'everyday' | 'weekdays' | 'weekend' | 'custom';

export interface IPricing extends Document {
  service: PricingService;
  category: PricingCategory;
  validity: PricingValidity;
  startDate?: Date; // required when validity = custom (and for special)
  endDate?: Date;   // required when validity = custom (and for special)
  adultPrice: number;
  childrenPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingSchema = new Schema<IPricing>({
  service: { type: String, enum: ['daypass', 'pasatarde', 'hospedaje'], required: true, index: true },
  category: { type: String, enum: ['standard', 'special'], required: true, index: true },
  validity: { type: String, enum: ['everyday', 'weekdays', 'weekend', 'custom'], required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  adultPrice: { type: Number, required: true, min: 0 },
  childrenPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

pricingSchema.pre('save', function(next) {
  // If category is special, validity must be custom and dates provided
  if (this.category === 'special') {
    if (this.validity !== 'custom') {
      return next(new Error('Special category requires validity to be Custom'));
    }
    if (!this.startDate || !this.endDate) {
      return next(new Error('Special pricing requires startDate and endDate'));
    }
  }
  // If validity is custom, ensure dates
  if (this.validity === 'custom') {
    if (!this.startDate || !this.endDate) {
      return next(new Error('Custom validity requires startDate and endDate'));
    }
  }

  // Normalize date range to day boundaries to guarantee inclusivity
  if (this.startDate) this.startDate = startOfDay(this.startDate);
  if (this.endDate) this.endDate = endOfDay(this.endDate);
  next();
});

// Ensure updates also normalize date boundaries
pricingSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update) {
    if (update.startDate) {
      const s = new Date(update.startDate);
      update.startDate = startOfDay(s);
    }
    if (update.endDate) {
      const e = new Date(update.endDate);
      update.endDate = endOfDay(e);
    }
  }
  next();
});

pricingSchema.index({ service: 1, category: 1, validity: 1, startDate: 1, endDate: 1 });

export default mongoose.model<IPricing>('Pricing', pricingSchema);
