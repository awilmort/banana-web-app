import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const GalleryPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();

  const galleryImages = [
    {
      src: '/images/home.jpg',
      title: 'Resort Overview',
      description: 'Beautiful tropical paradise setting'
    },
    {
      src: '/images/villa.png',
      title: 'Luxury Villa',
      description: 'Spacious and comfortable accommodations'
    },
    {
      src: '/images/aqua-park.png',
      title: 'Aqua Park',
      description: 'World-class water slides and pools'
    },
    {
      src: '/images/wedding.jpg',
      title: 'Event Venues',
      description: 'Perfect for weddings and special occasions'
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 6,
        }}
      >
        <Typography
          variant={isMobile ? 'h3' : 'h2'}
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            mb: 3,
          }}
        >
          {t('pages.gallery.title')}
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{
            maxWidth: 800,
            mx: 'auto',
            lineHeight: 1.6,
          }}
        >
          {t('pages.gallery.subtitle')}
        </Typography>
      </Box>

      {/* Gallery Grid */}
      <Grid container spacing={4}>
        {galleryImages.map((image, index) => (
          <Grid item xs={12} sm={6} md={6} key={index}>
            <Card
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme.shadows[12],
                },
              }}
            >
              <CardMedia
                component="img"
                height={isMobile ? "250" : "300"}
                image={image.src}
                alt={image.title}
                sx={{
                  objectFit: 'cover',
                }}
              />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {image.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {image.description}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Info */}
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          {t('pages.gallery.ctaTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          {t('pages.gallery.ctaBody')}
        </Typography>
      </Box>
    </Container>
  );
};

export default GalleryPage;
