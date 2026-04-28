'use client';
import AdminThemeRegistry from '@/components/providers/AdminThemeRegistry';
import { AuthProvider } from '@/contexts/AuthContext';
import ToastWrapper from '@/components/providers/ToastWrapper';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeRegistry>
      <AuthProvider>
        <ToastWrapper />
        {children}
      </AuthProvider>
    </AdminThemeRegistry>
  );
}
