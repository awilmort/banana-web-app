'use client';

import React from 'react';
import {
  Container, Typography, Box, Grid, Card, CardMedia, useTheme, useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const galleryImages = [
  { src: '/images/home.jpg', titleKey: 'pages.gallery.img.resort', descKey: 'pages.gallery.img.resortDesc' },
  { src: '/images/villa.png', titleKey: 'pages.gallery.img.villa', descKey: 'pages.gallery.img.villaDesc' },
  { src: '/images/aqua-park.png', titleKey: 'pages.gallery.img.aqua', descKey: 'pages.gallery.img.aquaDesc' },
  { src: '/images/wedding.jpg', titleKey: 'pages.gallery.img.events', descKey: 'pages.gallery.img.eventsDesc' },
];

export default function GalleryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant={isMobile ? 'h3' : 'h2'} component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
          {t('pages.gallery.title')}
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
          {t('pages.gallery.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {galleryImages.map((image, index) => (
          <Grid size={{ xs: 12, sm: 6 }} key={index}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: theme.shadows[12] } }}>
              <CardMedia component="img" height={isMobile ? '250' : '300'} image={image.src} alt={t(image.titleKey)} sx={{ objectFit: 'cover' }} />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t(image.titleKey)}</Typography>
                <Typography variant="body2" color="text.secondary">{t(image.descKey)}</Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
