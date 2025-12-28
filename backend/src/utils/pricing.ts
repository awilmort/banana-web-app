import Pricing, { PricingService } from '../models/Pricing';

export async function findApplicablePricing(service: PricingService, date: Date) {
  const on = new Date(date);
  const dayStart = new Date(on.getFullYear(), on.getMonth(), on.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(on.getFullYear(), on.getMonth(), on.getDate(), 23, 59, 59, 999);
  // Prefer special within date range (inclusive of entire day)
  const special = await Pricing.findOne({
    service,
    category: 'special',
    isActive: true,
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart },
  }).sort({ createdAt: -1 }).exec();
  if (special) return special;

  // Standard matching
  const day = on.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const validity = isWeekend ? 'weekend' : 'weekdays';

  // Try everyday
  let standard = await Pricing.findOne({ service, category: 'standard', isActive: true, validity: 'everyday' })
    .sort({ createdAt: -1 }).exec();
  if (standard) return standard;

  // Try weekend/weekdays
  standard = await Pricing.findOne({ service, category: 'standard', isActive: true, validity })
    .sort({ createdAt: -1 }).exec();
  if (standard) return standard;

  // Try custom windows that include the date (inclusive)
  standard = await Pricing.findOne({ service, category: 'standard', isActive: true, validity: 'custom', startDate: { $lte: dayEnd }, endDate: { $gte: dayStart } })
    .sort({ createdAt: -1 }).exec();
  return standard;
}
