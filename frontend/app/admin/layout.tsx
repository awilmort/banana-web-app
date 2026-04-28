'use client';

import React from 'react';
import AdminThemeRegistry from '@/components/providers/AdminThemeRegistry';
import AdminI18nProvider from '@/components/providers/AdminI18nProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import ToastWrapper from '@/components/providers/ToastWrapper';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeRegistry>
      <AdminI18nProvider>
        <AuthProvider>
          <ToastWrapper />
          <AdminLayout>{children}</AdminLayout>
        </AuthProvider>
      </AdminI18nProvider>
    </AdminThemeRegistry>
  );
}
