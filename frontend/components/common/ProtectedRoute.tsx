'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  /** When true, redirects to /login (admin login) instead of /{lang}/login */
  isAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission, isAdmin }) => {
  const { isAuthenticated, loading, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.startsWith('/en') ? 'en' : 'es';

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (isAdmin) {
        router.push('/login');
      } else {
        router.push(`/${lang}/login`);
      }
    }
  }, [loading, isAuthenticated, router, lang, isAdmin]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return null;

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
