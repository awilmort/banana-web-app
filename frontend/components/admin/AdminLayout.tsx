'use client';

import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard,
  Hotel,
  BookOnline,
  Analytics,
  Settings,
  Menu as MenuIcon,
  Logout,
  AttachMoney,
  Person,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  AccountCircle,
  ExitToApp,
  ConfirmationNumber,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;
const collapsedWidth = 72;

const SIDEBAR_BG = '#111827';
const SIDEBAR_TEXT = '#CBD5E1';
const SIDEBAR_ICON = '#64748B';
const SIDEBAR_ACTIVE_BG = 'rgba(246, 196, 98, 0.14)';
const SIDEBAR_ACTIVE_TEXT = '#F6C462';
const SIDEBAR_ACTIVE_ICON = '#F6C462';
const SIDEBAR_HOVER_BG = 'rgba(255,255,255,0.05)';
const SIDEBAR_DIVIDER = 'rgba(255,255,255,0.08)';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminSidebarOpen') !== 'false';
    }
    return true;
  });
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, loading, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      const currentPath = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : pathname || '/admin';
      const nextTarget = currentPath.startsWith('/admin') ? currentPath : '/admin';
      router.replace(`/login?next=${encodeURIComponent(nextTarget)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setSidebarOpen(prev => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminSidebarOpen', String(next));
        }
        return next;
      });
    } else {
      setMobileOpen(prev => !prev);
    }
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = React.useMemo(() => {
    const items = [
      { text: t('admin.nav.dashboard'), icon: <Dashboard />, path: '/admin', key: 'dashboard', perm: 'admin.dashboard' },
      { text: t('admin.nav.bookingCalendar', 'Booking Calendar'), icon: <CalendarMonth />, path: '/admin/booking-calendar', key: 'booking-calendar', perm: 'admin.schedule' },
      { text: t('admin.nav.reservations'), icon: <BookOnline />, path: '/admin/reservations', key: 'reservations', perm: 'admin.reservations' },
      { text: t('admin.nav.schedule'), icon: <Analytics />, path: '/admin/schedule', key: 'schedule', perm: 'admin.schedule' },
      { text: t('admin.nav.accommodations'), icon: <Hotel />, path: '/admin/accommodations', key: 'accommodations', perm: 'admin.accommodations' },
      { text: t('admin.nav.wristbands'), icon: <ConfirmationNumber />, path: '/admin/wristbands', key: 'wristbands', perm: 'admin.wristbands' },
      { text: t('admin.nav.revenue'), icon: <AttachMoney />, path: '/admin/revenue', key: 'revenue', perm: 'admin.revenue' },
      { text: t('admin.nav.commissions'), icon: <AttachMoney />, path: '/admin/commissions', key: 'commissions', perm: 'admin.commissions' },
      { text: t('admin.nav.guests'), icon: <Person />, path: '/admin/guests', key: 'guests', perm: 'admin.guests' },
      { text: t('admin.nav.rooms'), icon: <Hotel />, path: '/admin/rooms', key: 'rooms', perm: 'admin.rooms' },
      { text: t('admin.nav.pricing'), icon: <Settings />, path: '/admin/pricing', key: 'pricing', perm: 'admin.pricing' },
      { text: t('admin.nav.settings'), icon: <Settings />, path: '/admin/settings', key: 'settings', perm: 'admin.settings' },
    ];
    const role = user?.role || 'customer';
    if (role === 'admin') return items;
    const perms: string[] = (user as { permissions?: string[] })?.permissions || [];
    if (!perms || perms.length === 0) return [];
    return items.filter(i => {
      if (i.perm === 'admin.wristbands') {
        return perms.includes('admin.wristbands.view') || perms.includes('admin.wristbands.manage') || perms.includes('admin.access');
      }
      return perms.includes(i.perm) || perms.includes('admin.access');
    });
  }, [user, t]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#F1F4F8' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname?.startsWith(path) ?? false;
  };

  const drawerContent = (
    <Box sx={{ color: SIDEBAR_TEXT, height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* Logo + Toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 64,
          flexShrink: 0,
          position: 'relative',
          pl: sidebarOpen ? 1.5 : 0,
          borderBottom: `1px solid ${SIDEBAR_DIVIDER}`,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
        }}
      >
        <Box
          onClick={() => router.push('/admin')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }}
        >
          <Box sx={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="32" height="32" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 64 C14 50 12 34 18 22 C24 10 36 6 46 8 C54 10 60 16 62 24" stroke="#F9C74F" strokeWidth="10" strokeLinecap="round" fill="none" />
              <path d="M26 60 C19 47 18 32 24 21 C29 12 39 8 47 10" stroke="#FFE566" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55" />
              <path d="M46 8 C50 4 55 4 57 7" stroke="#7C5C0A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <path d="M22 64 C19 70 20 75 23 77" stroke="#7C5C0A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            </svg>
          </Box>
          {sidebarOpen && (
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9', letterSpacing: '-0.2px', lineHeight: 1, whiteSpace: 'nowrap', ml: 1.5 }}>
              Banana Ranch
            </Typography>
          )}
        </Box>
        {isDesktop && (
          <IconButton onClick={handleDrawerToggle} size="small" sx={{ color: SIDEBAR_ICON, position: 'absolute', right: 4, '&:hover': { color: SIDEBAR_TEXT } }}>
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        )}
      </Box>

      <List sx={{ flexGrow: 1, py: 1, px: 0.5 }}>
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.25 }}>
              <Tooltip title={!sidebarOpen ? item.text : ''} placement="right">
                <ListItemButton
                  onClick={() => {
                    router.push(item.path);
                    if (!isDesktop) setMobileOpen(false);
                  }}
                  sx={{
                    color: active ? SIDEBAR_ACTIVE_TEXT : SIDEBAR_TEXT,
                    bgcolor: active ? SIDEBAR_ACTIVE_BG : 'transparent',
                    borderRadius: '8px',
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    px: sidebarOpen ? 1.5 : 0,
                    mx: 0.5,
                    minHeight: 44,
                    borderLeft: active ? `3px solid ${SIDEBAR_ACTIVE_ICON}` : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: active ? SIDEBAR_ACTIVE_BG : SIDEBAR_HOVER_BG,
                      color: active ? SIDEBAR_ACTIVE_TEXT : '#E2E8F0',
                      borderLeft: active ? `3px solid ${SIDEBAR_ACTIVE_ICON}` : '3px solid rgba(246,196,98,0.4)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? SIDEBAR_ACTIVE_ICON : SIDEBAR_ICON, minWidth: sidebarOpen ? 36 : 48, justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText primary={item.text} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: active ? 600 : 400 } } }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: SIDEBAR_DIVIDER, mx: 1 }} />

      <List sx={{ py: 1, px: 0.5 }}>
        <ListItem disablePadding>
          <Tooltip title={!sidebarOpen ? t('auth.logout') : ''} placement="right">
            <ListItemButton
              onClick={handleLogout}
              sx={{
                color: SIDEBAR_TEXT,
                borderRadius: '8px',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                px: sidebarOpen ? 1.5 : 0,
                mx: 0.5,
                minHeight: 44,
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: 'rgba(252,129,129,0.1)', color: '#FC8181' },
              }}
            >
              <ListItemIcon sx={{ color: SIDEBAR_ICON, minWidth: sidebarOpen ? 36 : 48, justifyContent: 'center' }}>
                <Logout />
              </ListItemIcon>
              {sidebarOpen && (
                <ListItemText primary={t('auth.logout')} slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  const drawerSx = (width: number) => ({
    width,
    flexShrink: 0,
    transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp }),
    '& .MuiDrawer-paper': {
      width,
      boxSizing: 'border-box' as const,
      bgcolor: SIDEBAR_BG,
      color: SIDEBAR_TEXT,
      overflowX: 'hidden',
      transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp }),
      borderRight: `1px solid ${SIDEBAR_DIVIDER}`,
    },
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F4F8' }}>
      {isDesktop && (
        <Drawer variant="permanent" sx={drawerSx(sidebarOpen ? drawerWidth : collapsedWidth)}>
          {drawerContent}
        </Drawer>
      )}

      {!isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box' as const,
              bgcolor: SIDEBAR_BG,
              color: SIDEBAR_TEXT,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <Box
          sx={{
            position: 'fixed',
            top: 12,
            right: 16,
            zIndex: theme.zIndex.appBar + 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '40px',
            px: 1.5,
            py: 0.75,
            boxShadow: '0 1px 8px rgba(0,0,0,0.10)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <LanguageSwitcher />
          <IconButton size="small" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            {user?.firstName ? (
              <Avatar sx={{ width: 30, height: 30, bgcolor: '#2E7D4F', fontSize: 13, fontWeight: 700 }}>
                {user.firstName.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircle sx={{ color: '#374151', fontSize: 28 }} />
            )}
          </IconButton>
        </Box>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { borderRadius: '12px', minWidth: 185, mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
        >
          {user?.firstName && (
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {user.firstName} {user.lastName}
              </Typography>
            </MenuItem>
          )}
          {user?.firstName && <Divider />}
          <MenuItem onClick={() => { setUserMenuAnchor(null); router.push('/admin/profile'); }}>
            <AccountCircle sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body2">{t('admin.header.profile', 'Profile')}</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); router.push('/admin'); }}>
            <Dashboard sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body2">{t('admin.header.dashboard', 'Dashboard')}</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ExitToApp sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body2">{t('auth.logout')}</Typography>
          </MenuItem>
        </Menu>

        <Box component="main" sx={{ flexGrow: 1 }}>
          {!isDesktop && (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2, pb: 1 }}>
              <IconButton aria-label="open menu" onClick={handleDrawerToggle}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ ml: 1 }}>
                {t('admin.title')}
              </Typography>
            </Box>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
