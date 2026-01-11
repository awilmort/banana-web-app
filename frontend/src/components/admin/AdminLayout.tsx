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
  Toolbar,
} from '@mui/material';
import {
  Dashboard,
  Hotel,
  BookOnline,
  People,
  ContactMail,
  Photo,
  Analytics,
  Settings,
  Menu,
  Logout,
  Star,
  Celebration,
  AttachMoney,
} from '@mui/icons-material';
import { ConfirmationNumber } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../layout/Header';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Build menu and filter by granular permissions (admin sees all)
  const menuItems = React.useMemo(() => {
    const items = [
      { text: t('admin.nav.dashboard'), icon: <Dashboard />, path: '/admin', key: 'dashboard', perm: 'admin.dashboard' },
      { text: t('admin.nav.revenue'), icon: <AttachMoney />, path: '/admin/revenue', key: 'revenue', perm: 'admin.revenue' },
      { text: t('admin.nav.commissions'), icon: <AttachMoney />, path: '/admin/commissions', key: 'commissions', perm: 'admin.commissions' },
      { text: t('admin.nav.schedule'), icon: <Analytics />, path: '/admin/schedule', key: 'schedule', perm: 'admin.schedule' },
      { text: t('admin.nav.accommodations'), icon: <Hotel />, path: '/admin/accommodations', key: 'accommodations', perm: 'admin.accommodations' },
      { text: t('admin.nav.rooms'), icon: <Hotel />, path: '/admin/rooms', key: 'rooms', perm: 'admin.rooms' },
      { text: t('admin.nav.amenities'), icon: <Star />, path: '/admin/amenities', key: 'amenities', perm: 'admin.amenities' },
      { text: t('admin.nav.eventTypes'), icon: <Celebration />, path: '/admin/event-types', key: 'event-types', perm: 'admin.eventTypes' },
      { text: t('admin.nav.wristbands'), icon: <ConfirmationNumber />, path: '/admin/wristbands', key: 'wristbands', perm: 'admin.wristbands' },
      { text: t('admin.nav.pricing'), icon: <Settings />, path: '/admin/pricing', key: 'pricing', perm: 'admin.pricing' },
      { text: t('admin.nav.reservations'), icon: <BookOnline />, path: '/admin/reservations', key: 'reservations', perm: 'admin.reservations' },
      { text: t('admin.nav.users'), icon: <People />, path: '/admin/users', key: 'users', perm: 'admin.users' },
      { text: t('admin.nav.roles'), icon: <Settings />, path: '/admin/roles', key: 'roles', perm: 'admin.roles' },
      { text: t('admin.nav.contacts'), icon: <ContactMail />, path: '/admin/contacts', key: 'contacts', perm: 'admin.contacts' },
      { text: t('admin.nav.media'), icon: <Photo />, path: '/admin/media', key: 'media', perm: 'admin.media' },
      { text: t('admin.nav.analytics'), icon: <Analytics />, path: '/admin/analytics', key: 'analytics', perm: 'admin.analytics' },
      { text: t('admin.nav.settings'), icon: <Settings />, path: '/admin/settings', key: 'settings', perm: 'admin.settings' },
    ];
    const role = user?.role || 'customer';
    if (role === 'admin') return items;
    const perms: string[] = (user as any)?.permissions || [];
    if (!perms || perms.length === 0) return [];
    return items.filter(i => {
      // For wristbands, allow access if user has either view or manage permission
      if (i.perm === 'admin.wristbands') {
        return perms.includes('admin.wristbands.view') || perms.includes('admin.wristbands.manage') || perms.includes('admin.access');
      }
      return perms.includes(i.perm) || perms.includes('admin.access');
    });
  }, [user, t]);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {t('admin.panelTitle')}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (!isDesktop) {
                  setMobileOpen(false);
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary={t('auth.logout')} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Global Header */}
      <Header
        showHamburger
        onHamburgerClick={handleDrawerToggle}
        offsetLeft={isDesktop && sidebarOpen ? drawerWidth : 0}
      />

      {/* Sidebar Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'persistent' : 'temporary'}
          open={isDesktop ? sidebarOpen : mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 0,
              height: '100%',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
            ml: { md: `${sidebarOpen ? drawerWidth : 0}px` },
          }}
        >
          {/* Top row hamburger (mobile) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', mb: 2 }}>
            <IconButton aria-label="open menu" onClick={handleDrawerToggle}>
              <Menu />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>
                {t('admin.title')}
            </Typography>
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
