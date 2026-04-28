'use client';
import AdminThemeRegistry from '@/components/providers/AdminThemeRegistry';
import ToastWrapper from '@/components/providers/ToastWrapper';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeRegistry>
      <ToastWrapper />
      {children}
    </AdminThemeRegistry>
  );
}
