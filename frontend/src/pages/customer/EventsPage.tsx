import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Restaurant,
  PhotoCamera,
  Celebration,
} from '@mui/icons-material';
import EventBookingForm from '../../components/booking/EventBookingForm';
import { eventTypesService } from '../../services/api';
import { EventType } from '../../types';
import { useTranslation } from 'react-i18next';

const EventsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  // Removed unused error state to satisfy ESLint warnings
  const [formKey, setFormKey] = useState<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    const loadTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await eventTypesService.getEventTypes();
        const payload = res.data?.data as EventType[] | undefined;
        setEventTypes(payload || []);
        if ((payload || []).length > 0) {
          setSelectedEventType((payload || [])[0].type);
        } else {
          // Fallback to 'other' to allow immediate booking if no types exist yet
          setSelectedEventType('other');
        }
      } catch (err: any) {
        // Fallback selection for resilience
        setSelectedEventType('other');
      } finally {
        setLoadingTypes(false);
      }
    };
    loadTypes();
  }, []);

  const selectedEventData = eventTypes.find(e => e.type === selectedEventType);

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: '50vh', md: '60vh' },
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&w=1200&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: 'center',
              color: 'white',
              maxWidth: 800,
              mx: 'auto',
            }}
          >
            <Typography
              variant={isMobile ? 'h3' : 'h1'}
              gutterBottom
              sx={{
                fontWeight: 700,
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {t('pages.events.heroTitle')}
            </Typography>
            <Typography
              variant={isMobile ? 'h6' : 'h4'}
              gutterBottom
              sx={{
                mb: 4,
                fontWeight: 300,
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {t('pages.events.heroSubtitle')}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Event Type Select + Immediate Form */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
          {t('pages.events.bookEvent')}
        </Typography>
        {/* If loading or error, still allow booking using fallback selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t('pages.events.eventType')}</InputLabel>
          <Select
            value={selectedEventType}
            label={t('pages.events.eventType')}
            onChange={(e) => setSelectedEventType(String(e.target.value))}
            disabled={loadingTypes || eventTypes.length === 0}
          >
            {eventTypes.map((et) => (
              <MenuItem key={et._id} value={et.type}>{et.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedEventType && (
          <EventBookingForm
            key={formKey}
            eventType={selectedEventType as any}
            eventData={selectedEventData ? {
              title: selectedEventData.title,
              priceFrom: selectedEventData.priceFrom,
              maxGuests: selectedEventData.maxGuests,
              maxChildren: selectedEventData.maxChildren,
              maxAdults: (selectedEventData as any).maxAdults,
              features: selectedEventData.features || []
            } : undefined}
            onCancel={() => {
              // Remount the form to reset its internal state
              setFormKey(prev => prev + 1);
              // Optionally scroll to the top of the form for better UX
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </Container>

      {/* Why Choose Us Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              mb: 6,
            }}
          >
            {t('pages.events.whyChooseTitle')}
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  borderRadius: 3,
                }}
              >
                <Restaurant sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('pages.events.cateringTitle')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('pages.events.cateringBody')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  borderRadius: 3,
                }}
              >
                <PhotoCamera sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('pages.events.servicesTitle')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('pages.events.servicesBody')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  borderRadius: 3,
                }}
              >
                <Celebration sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('pages.events.paradiseTitle')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('pages.events.paradiseBody')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default EventsPage;
