'use client';
import React, { Suspense } from 'react';
import ReservationManagement from '@/components/admin/pages/ReservationManagement';
export default function ReservationManagementPage() {
  return (
    <Suspense>
      <ReservationManagement />
    </Suspense>
  );
}
