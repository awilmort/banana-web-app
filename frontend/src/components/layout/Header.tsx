import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  ExitToApp,
  Hotel,
  Photo,
  ContactMail,
  Home,
  BookOnline,
  Pool,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  showHamburger?: boolean;
  onHamburgerClick?: () => void;
  offsetLeft?: number; // used to shrink and offset AppBar when sidebar is persistent
}

const Header: React.FC<HeaderProps> = ({ showHamburger = false, onHamburgerClick, offsetLeft }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, permissions } = useAuth();
  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/');
  };

  const navigateTo = (path: string) => {
    navigate(path);
    handleUserMenuClose();
    handleMobileMenuClose();
  };

  const navigationItems = [
    { label: t('nav.home'), path: '/', icon: <Home /> },
    { label: t('nav.rooms'), path: '/rooms', icon: <Hotel /> },
    { label: t('nav.daypass'), path: '/daypass', icon: <Pool /> },
    { label: t('nav.events'), path: '/events', icon: <BookOnline /> },
    { label: t('nav.gallery'), path: '/gallery', icon: <Photo /> },
    { label: t('nav.contact'), path: '/contact', icon: <ContactMail /> },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <AppBar
      position="static"
      color="primary"
      elevation={2}
      sx={offsetLeft ? { width: `calc(100% - ${offsetLeft}px)`, ml: `${offsetLeft}px` } : undefined}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo/Brand */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => navigateTo('/')}
          >
            {showHamburger && (
              <IconButton
                size="large"
                aria-label="open sidebar"
                onClick={(e) => { e.stopPropagation(); onHamburgerClick && onHamburgerClick(); }}
                color="inherit"
                sx={{ mr: 1, display: { xs: 'inline-flex', md: 'inline-flex' } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Banana Ranch Villages
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  onClick={() => navigateTo(item.path)}
                  sx={{
                    fontWeight: 500,
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    backgroundColor: isActivePath(item.path) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  startIcon={item.icon}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Language Switcher */}
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  onClick={handleUserMenuOpen}
                  color="inherit"
                >
                  {user?.avatar ? (
                    <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 32, height: 32 }} />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {user?.firstName?.[0]?.toUpperCase()}
                    </Avatar>
                  )}
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem onClick={handleUserMenuClose} disabled>
                    <Typography variant="body2" color="text.secondary">
                      {t('auth.welcome', { name: user?.firstName })}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => navigateTo('/profile')}>
                    <AccountCircle sx={{ mr: 1 }} />
                    {t('auth.profile')}
                  </MenuItem>
                  <MenuItem onClick={() => navigateTo('/reservations')}>
                    <BookOnline sx={{ mr: 1 }} />
                    {t('auth.myReservations')}
                  </MenuItem>
                  {(user && (user.role === 'admin' || Array.isArray(permissions))) && (
                    <MenuItem onClick={() => {
                      const perms = permissions || [];
                      if (user.role === 'admin' || perms.includes('admin.dashboard') || perms.includes('admin.access')) {
                        navigateTo('/admin');
                        return;
                      }
                      const permToPath: { key: string; path: string }[] = [
                        { key: 'admin.schedule', path: '/admin/schedule' },
                        { key: 'admin.accommodations', path: '/admin/accommodations' },
                        { key: 'admin.reservations', path: '/admin/reservations' },
                        { key: 'admin.rooms', path: '/admin/rooms' },
                        { key: 'admin.media', path: '/admin/media' },
                        { key: 'admin.users', path: '/admin/users' },
                        { key: 'admin.roles', path: '/admin/roles' },
                        { key: 'admin.eventTypes', path: '/admin/event-types' },
                        { key: 'admin.pricing', path: '/admin/pricing' },
                        { key: 'admin.contacts', path: '/admin/contacts' },
                        { key: 'admin.analytics', path: '/admin/analytics' },
                        { key: 'admin.settings', path: '/admin/settings' },
                      ];
                      const first = permToPath.find(p => perms.includes(p.key));
                      navigateTo(first ? first.path : '/');
                    }}>
                      <Dashboard sx={{ mr: 1 }} />
                      {t('auth.adminDashboard')}
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 1 }} />
                    {t('auth.logout')}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  color="inherit"
                  onClick={() => navigateTo('/login')}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {t('auth.login')}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigateTo('/register')}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontWeight: 600,
                  }}
                >
                  {t('auth.signup')}
                </Button>
              </Box>
            )}

            {/* Mobile Menu */}
            {isMobile && (
              <IconButton
                size="large"
                aria-label="mobile menu"
                aria-controls="mobile-menu"
                aria-haspopup="true"
                onClick={handleMobileMenuOpen}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Navigation Menu */}
      <Menu
        id="mobile-menu"
        anchorEl={mobileMenuAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(mobileMenuAnchorEl)}
        onClose={handleMobileMenuClose}
      >
        {navigationItems.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => navigateTo(item.path)}
            selected={isActivePath(item.path)}
          >
            {item.icon}
            <Typography sx={{ ml: 1 }}>{item.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </AppBar>
  );
};

export default Header;
