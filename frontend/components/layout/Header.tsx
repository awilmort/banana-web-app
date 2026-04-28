'use client';

import React from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, IconButton,
  Menu, MenuItem, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon, Hotel, Photo, ContactMail, Home, BookOnline, Pool,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  // Determine current locale from pathname
  const lang = pathname.startsWith('/en') ? 'en' : 'es';

  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const navigateTo = (path: string) => {
    router.push(`/${lang}${path}`);
    setMobileMenuAnchorEl(null);
  };

  const navigationItems = [
    { label: t('nav.home'), path: '' },
    { label: t('nav.rooms'), path: '/rooms'},
    { label: t('nav.daypass'), path: '/daypass' },
    { label: t('nav.afternoonPass'), path: '/pasatarde' },
    { label: t('nav.howToGetHere'), path: '/how-to-get-here' },
    { label: t('nav.journal'), path: '/blog' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  const isActivePath = (path: string) => {
    const full = `/${lang}${path}`;
    if (path === '') return pathname === `/${lang}` || pathname === `/${lang}/`;
    return pathname.startsWith(full);
  };

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Brand */}
          <Box
            component={Link}
            href={`/${lang}`}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
          >
            <Typography variant="h5" component="span" sx={{ fontWeight: 700, color: 'white' }}>
              <span style={{ color: '#F5C518' }}>BANANA</span> AQUA PARK
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
                    textTransform: 'uppercase',
                    backgroundColor: isActivePath(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Right controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LanguageSwitcher dark />

            {/* Mobile hamburger */}
            {isMobile && (
              <IconButton
                size="large"
                aria-label="mobile menu"
                onClick={(e) => setMobileMenuAnchorEl(e.currentTarget)}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchorEl}
        open={Boolean(mobileMenuAnchorEl)}
        onClose={() => setMobileMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {navigationItems.map((item) => (
          <MenuItem key={item.path} onClick={() => navigateTo(item.path)} selected={isActivePath(item.path)}>
            <Typography sx={{ ml: 1 }}>{item.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </AppBar>
  );
};

export default Header;
