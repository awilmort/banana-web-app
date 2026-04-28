'use client';

import React from 'react';
import {
  Box, Container, Grid, Typography, IconButton, Divider,
} from '@mui/material';
import { Facebook, Twitter, Instagram, Email, Phone, LocationOn } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAdminUrl } from '@/utils/subdomain';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  const pathname = usePathname();
  const lang = pathname.startsWith('/en') ? 'en' : 'es';

  const [portalUrl, setPortalUrl] = React.useState('https://app.bananaaquapark.com/admin');
  React.useEffect(() => { setPortalUrl(getAdminUrl() + '/admin'); }, []);

  return (
    <Box component="footer" sx={{ bgcolor: 'primary.dark', color: 'white', pt: 6, pb: 3, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              <span style={{ color: '#F5C518' }}>BANANA</span> AQUA PARK
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              {t('footer.description')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton color="inherit" aria-label="Facebook" component="a" href="https://www.facebook.com/BananaRanchvillages/" target="_blank" rel="noopener noreferrer" sx={{ '&:hover': { color: 'secondary.main' } }}>
                <Facebook />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter" sx={{ '&:hover': { color: 'secondary.main' } }}>
                <Twitter />
              </IconButton>
              <IconButton color="inherit" aria-label="Instagram" component="a" href="https://www.instagram.com/bananaranchandvillages/" target="_blank" rel="noopener noreferrer" sx={{ '&:hover': { color: 'secondary.main' } }}>
                <Instagram />
              </IconButton>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {t('footer.quickLinks')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { href: `/${lang}`, label: t('nav.home') },
                { href: `/${lang}/rooms`, label: t('footer.roomsAndSuites') },
                { href: `/${lang}/daypass`, label: t('nav.daypass') },
                { href: `/${lang}/events`, label: t('nav.events') },
                { href: `/${lang}/gallery`, label: t('nav.gallery') },
                { href: `/${lang}/contact`, label: t('footer.contactUs') },
                { href: portalUrl, label: t('footer.portal'), external: true },
              ].map(({ href, label, external }) => (
                external ? (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none', opacity: 0.9 }}
                  >
                    <Typography variant="body2" component="span">
                      {label}
                    </Typography>
                  </a>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    style={{ color: 'inherit', textDecoration: 'none', opacity: 0.9 }}
                  >
                    <Typography variant="body2" component="span">
                      {label}
                    </Typography>
                  </Link>
                )
              ))}
            </Box>
          </Grid>

          {/* Services */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {t('footer.ourServices')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                t('footer.services.luxuryAccommodations'),
                t('footer.services.aquaPark'),
                t('footer.services.spaWellness'),
                t('footer.services.fineDining'),
                t('footer.services.conferenceFacilities'),
                t('footer.services.eventPlanning'),
              ].map((s) => (
                <Typography key={s} variant="body2" sx={{ opacity: 0.9 }}>{s}</Typography>
              ))}
            </Box>
          </Grid>

          {/* Contact */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {t('footer.contactInformation')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{t('footer.address')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{t('footer.phone')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{t('footer.email')}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {t('footer.copyright', { year: currentYear })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Link href={`/${lang}/privacy`} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.8 }}>
              <Typography variant="body2" component="span">{t('footer.privacyPolicy')}</Typography>
            </Link>
            <Link href={`/${lang}/terms`} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.8 }}>
              <Typography variant="body2" component="span">{t('footer.termsOfService')}</Typography>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
