export type PricingRule = {
  _id?: string;
  service: 'daypass' | 'pasatarde' | 'hospedaje';
  category: 'standard' | 'special';
  validity: 'everyday' | 'weekdays' | 'weekend' | 'custom';
  startDate?: string;
  endDate?: string;
  adultPrice: number;
  childrenPrice: number;
  isActive?: boolean;
};

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function inRange(date: Date, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const d = new Date(date.toDateString());
  const s = new Date(new Date(start).toDateString());
  const e = new Date(new Date(end).toDateString());
  return d >= s && d <= e;
}

export function findApplicablePricing(rules: PricingRule[], date: Date): PricingRule | null {
  const active = rules.filter(r => r.isActive !== false);
  const specials = active.filter(r => r.category === 'special');
  const specialForDate = specials.find(r => inRange(date, r.startDate, r.endDate));
  if (specialForDate) return specialForDate;

  const standards = active.filter(r => r.category === 'standard');
  const everyday = standards.find(r => r.validity === 'everyday');
  if (everyday) return everyday;
  const weekend = standards.find(r => r.validity === 'weekend');
  const weekdays = standards.find(r => r.validity === 'weekdays');
  if (isWeekend(date) && weekend) return weekend;
  if (!isWeekend(date) && weekdays) return weekdays;
  const customs = standards.filter(r => r.validity === 'custom');
  const customForDate = customs.find(r => inRange(date, r.startDate, r.endDate));
  if (customForDate) return customForDate;

  return null;
}
