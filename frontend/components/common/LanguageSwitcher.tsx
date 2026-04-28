'use client';

import React from 'react';
import { IconButton, Menu, MenuItem, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';

interface LanguageSwitcherProps {
  dark?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ dark = false }) => {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const borderColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.23)';
  const color = dark ? 'white' : 'text.primary';

  const handleChangeLanguage = (newLang: string) => {
    setAnchor(null);
    if (newLang === currentLang) return;

    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Admin routes have no [lang] URL segment — change language in-place without navigation.
    const isAdminPath = pathname.startsWith('/admin');
    if (isAdminPath) {
      i18n.changeLanguage(newLang);
      return;
    }

    // Replace current lang segment in pathname for public routes
    const segments = pathname.split('/');
    if (segments[1] === 'en' || segments[1] === 'es') {
      segments[1] = newLang;
    } else {
      segments.splice(1, 0, newLang);
    }
    router.push(segments.join('/') || `/${newLang}`);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        disableRipple
        aria-label="select language"
        sx={{
          color,
          border: `1px solid ${borderColor}`,
          borderRadius: '9999px',
          px: 1.5,
          py: 0.5,
          gap: 0.5,
          transition: 'all 0.2s ease-out',
          '&:hover': {
            bgcolor: dark ? 'rgba(255,255,255,0.1)' : '#F7F7F7',
            borderColor: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
          },
        }}
      >
        <LanguageIcon sx={{ fontSize: 18 }} />
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', lineHeight: 1 }}>
          {currentLang}
        </Typography>
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', mt: 1, minWidth: 140 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => handleChangeLanguage('es')}
          selected={currentLang === 'es'}
          sx={{ fontSize: '0.9rem', borderRadius: '8px', mx: 0.5 }}
        >
          {t('common.spanish')}
        </MenuItem>
        <MenuItem
          onClick={() => handleChangeLanguage('en')}
          selected={currentLang === 'en'}
          sx={{ fontSize: '0.9rem', borderRadius: '8px', mx: 0.5 }}
        >
          {t('common.english')}
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
