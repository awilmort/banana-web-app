'use client';
import { Suspense } from 'react';
import AdminPasswordResetPage from '@/components/auth/AdminPasswordResetPage';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <AdminPasswordResetPage />
    </Suspense>
  );
}
