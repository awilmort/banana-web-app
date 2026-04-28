import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reservation Confirmation | Banana Ranch Villages',
  description: 'View your reservation details and manage your booking at Banana Ranch Villages.',
  robots: { index: false, follow: false },
};

export default function ReservationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
