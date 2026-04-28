'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, useTheme, useMediaQuery, FormControl, InputLabel,
  Select, MenuItem, Grid, Paper,
} from '@mui/material';
import { Restaurant, PhotoCamera, Celebration } from '@mui/icons-material';
import EventBookingForm from '@/components/booking/EventBookingForm';
import { eventTypesService } from '@/lib/api';
import { EventType } from '@/types';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';

export default function EventsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { t } = useTranslation();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';

  useEffect(() => {
    (async () => {
      setLoadingTypes(true);
      try {
        const res = await eventTypesService.getEventTypes();
        const payload = (res.data?.data as EventType[]) || [];
        setEventTypes(payload);
        if (payload.length > 0) setSelectedEventType(payload[0].type);
        else setSelectedEventType('other');
      } catch { setSelectedEventType('other'); }
      finally { setLoadingTypes(false); }
    })();
  }, []);

  const selectedEventData = eventTypes.find((e) => e.type === selectedEventType);

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: { xs: '50vh', md: '60vh' }, backgroundImage: 'linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&w=1200&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', color: 'white', maxWidth: 800, mx: 'auto' }}>
            <Typography variant={isMobile ? 'h3' : 'h1'} gutterBottom sx={{ fontWeight: 700, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{t('pages.events.heroTitle')}</Typography>
            <Typography variant={isMobile ? 'h6' : 'h4'} gutterBottom sx={{ mb: 4, fontWeight: 300, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('pages.events.heroSubtitle')}</Typography>
          </Box>
        </Container>
      </Box>

      {/* Booking Form */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>{t('pages.events.bookEvent')}</Typography>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t('pages.events.eventType')}</InputLabel>
          <Select value={selectedEventType} label={t('pages.events.eventType')} disabled={loadingTypes || eventTypes.length === 0}
            onChange={(e) => setSelectedEventType(String(e.target.value))}>
            {eventTypes.map((et) => <MenuItem key={et._id} value={et.type}>{et.title}</MenuItem>)}
          </Select>
        </FormControl>
        {selectedEventType && (
          <EventBookingForm key={formKey} eventType={selectedEventType as Parameters<typeof EventBookingForm>[0]['eventType']}
            eventData={selectedEventData ? { title: selectedEventData.title, priceFrom: selectedEventData.priceFrom, maxGuests: selectedEventData.maxGuests, maxChildren: selectedEventData.maxChildren, maxAdults: (selectedEventData as EventType & { maxAdults?: number }).maxAdults, features: selectedEventData.features || [] } : undefined}
            onCancel={() => { setFormKey((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        )}
      </Container>

      {/* Why Choose Us */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 6 }}>{t('pages.events.whyChooseTitle')}</Typography>
          <Grid container spacing={4}>
            {[
              { icon: <Restaurant sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />, titleKey: 'pages.events.cateringTitle', bodyKey: 'pages.events.cateringBody' },
              { icon: <PhotoCamera sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />, titleKey: 'pages.events.servicesTitle', bodyKey: 'pages.events.servicesBody' },
              { icon: <Celebration sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />, titleKey: 'pages.events.venueTitle', bodyKey: 'pages.events.venueBody' },
            ].map((item, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Paper elevation={2} sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 3 }}>
                  {item.icon}
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>{t(item.titleKey)}</Typography>
                  <Typography variant="body1" color="text.secondary">{t(item.bodyKey)}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
