'use client';

import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button, TextField,
  Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { CheckCircle, Pool, LocalParking, Wifi, Shower, Weekend, Waves } from '@mui/icons-material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import { getCountriesForDisplay } from '@/utils/countries';
import { pricingService, reservationsService } from '@/lib/api';
import NumberField from '@/components/common/NumberField';
import SingleDatePicker from '@/components/common/SingleDatePicker';
import { findApplicablePricing, PricingRule } from '@/utils/pricing';
import { formatMoney } from '@/utils/currency';

interface DayPassData {
  visitDate: Date | null;
  guestDetails: { adults: number; children: number; infants: number };
  contactInfo: { firstName: string; lastName: string; email: string; phone: string; country: string };
  services: { breakfast: boolean; spa: boolean; aquaPark: boolean };
  specialRequests: string;
}

export default function PasaTardePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';

  const [bookingData, setBookingData] = useState<DayPassData>({
    visitDate: new Date(),
    guestDetails: { adults: 1, children: 0, infants: 0 },
    contactInfo: { firstName: '', lastName: '', email: '', phone: '', country: '' },
    services: { breakfast: false, spa: false, aquaPark: false },
    specialRequests: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [adultRate, setAdultRate] = useState(0);
  const [childrenRate, setChildrenRate] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await pricingService.getPricing({ service: 'pasatarde' });
        setPricingRules((res.data.data as PricingRule[]) || []);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!bookingData.visitDate || pricingRules.length === 0) return;
    const rule = findApplicablePricing(pricingRules, bookingData.visitDate);
    setAdultRate(rule?.adultPrice || 0);
    setChildrenRate(rule?.childrenPrice || 0);
  }, [bookingData.visitDate, pricingRules]);

  const calculateTotalPrice = () => {
    const base = adultRate * bookingData.guestDetails.adults + childrenRate * bookingData.guestDetails.children;
    return Math.round(base * 100) / 100;
  };

  const handleSubmit = async () => {
    if (!bookingData.visitDate) { setError(t('daypass.errors.selectDate')); return; }
    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName) { setError(t('daypass.errors.nameRequired')); return; }
    if (!bookingData.contactInfo.email) { setError(t('daypass.errors.emailRequired')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.contactInfo.email)) { setError(t('daypass.errors.emailInvalid')); return; }
    if (bookingData.guestDetails.adults < 1) { setError(t('daypass.errors.adultsRequired')); return; }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        type: 'PasaTarde' as const,
        checkInDate: bookingData.visitDate?.toISOString(),
        guestDetails: bookingData.guestDetails,
        guestName: { firstName: bookingData.contactInfo.firstName, lastName: bookingData.contactInfo.lastName },
        contactInfo: { phone: bookingData.contactInfo.phone, email: bookingData.contactInfo.email, country: bookingData.contactInfo.country },
        services: bookingData.services,
        specialRequests: bookingData.specialRequests,
        guests: bookingData.guestDetails.adults + bookingData.guestDetails.children + bookingData.guestDetails.infants,
      };
      const resp = await reservationsService.createReservation(payload as Parameters<typeof reservationsService.createReservation>[0]);
      if (resp.data?.success) setSuccess(true);
      else throw new Error(resp.data?.message || t('daypass.errors.bookingFailed'));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || t('daypass.errors.bookingFailed'));
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="primary">
            {t('daypass.successPasaTardeTitle')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {t('daypass.successBody', {
              product: t('daypass.productPasaTarde'),
              date: bookingData.visitDate ? format(bookingData.visitDate, 'MMMM dd, yyyy') : '',
            })}
          </Typography>
          <Button variant="contained" onClick={() => router.push(`/${lang}/reservations`)} sx={{ mr: 2 }}>
            {t('daypass.viewReservations')}
          </Button>
          <Button variant="outlined" onClick={() => { setSuccess(false); setBookingData(prev => ({ ...prev, visitDate: null, services: { breakfast: false, spa: false, aquaPark: false } })); }}>
            {t('daypass.bookAnotherPasaTarde')}
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ position: 'relative', height: { xs: '40vh', md: '50vh' }, backgroundImage: 'linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&w=1200&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', color: 'white', maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h2" gutterBottom sx={{ fontWeight: 700, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{t('daypass.pasatardeHeroTitle')}</Typography>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 300, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{t('daypass.pasatardeHeroSubtitle')}</Typography>
          </Box>
        </Container>
      </Box>

      {/* Booking Form */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                  {t('daypass.bookTitlePasaTarde')}
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                <Grid container spacing={3}>
                  <Grid size={12}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 500, mb: 1 }}>
                      {t('daypass.visitDate')} *
                    </Typography>
                    <SingleDatePicker
                      value={bookingData.visitDate ? format(bookingData.visitDate, 'yyyy-MM-dd') : ''}
                      onChange={(dateStr) => {
                        if (dateStr) { const [y, m, d] = dateStr.split('-').map(Number); setBookingData(prev => ({ ...prev, visitDate: new Date(y, m - 1, d) })); }
                        else setBookingData(prev => ({ ...prev, visitDate: null }));
                      }}
                      minDate={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </Grid>
                  <Grid size={12}><Typography variant="h6" gutterBottom sx={{ mt: 2 }}>{t('common.guestDistribution')}</Typography></Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <NumberField label={t('daypass.adults')} value={bookingData.guestDetails.adults} min={1} fullWidth required
                      onChange={(val) => setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, adults: val ?? 0 } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <NumberField label={t('daypass.children')} value={bookingData.guestDetails.children} min={0} fullWidth
                      onChange={(val) => setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, children: val ?? 0 } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <NumberField label={t('daypass.infants')} value={bookingData.guestDetails.infants} min={0} fullWidth
                      onChange={(val) => setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, infants: val ?? 0 } }))} />
                  </Grid>
                  <Grid size={12}><Typography variant="h6" gutterBottom sx={{ mt: 2 }}>{t('daypass.contactInfo')}</Typography></Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('daypass.firstName')} fullWidth required value={bookingData.contactInfo.firstName}
                      onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, firstName: e.target.value } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('daypass.lastName')} fullWidth required value={bookingData.contactInfo.lastName}
                      onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, lastName: e.target.value } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('daypass.email')} type="email" fullWidth required value={bookingData.contactInfo.email}
                      onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, email: e.target.value } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('daypass.phone')} type="tel" fullWidth value={bookingData.contactInfo.phone}
                      onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, phone: e.target.value } }))} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>{t('daypass.country')}</InputLabel>
                      <Select value={bookingData.contactInfo.country} label={t('daypass.country')}
                        onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, country: e.target.value } }))}>
                        {getCountriesForDisplay().map((c) => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={12}>
                    <TextField label={t('daypass.specialRequests')} multiline rows={3} fullWidth
                      placeholder={t('daypass.specialRequestsPlaceholder')} value={bookingData.specialRequests}
                      onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))} />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading || !bookingData.visitDate} sx={{ px: 6, py: 2, fontSize: '1.1rem', fontWeight: 600 }}>
                    {loading ? <><CircularProgress size={24} sx={{ mr: 2 }} />Booking...</> : t('daypass.bookButtonPasaTarde', { price: formatMoney(calculateTotalPrice()) })}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">{t('daypass.includedTitle')}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { key: 'includedPool', icon: <Pool fontSize="small" /> },
                    { key: 'includedParking', icon: <LocalParking fontSize="small" /> },
                    { key: 'includedWifi', icon: <Wifi fontSize="small" /> },
                    { key: 'includedChangingRooms', icon: <Shower fontSize="small" /> },
                    { key: 'includedLounge', icon: <Weekend fontSize="small" /> },
                    { key: 'includedAquaPark', icon: <Waves fontSize="small" /> },
                  ].map(({ key, icon }) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                      <Typography variant="body2">{t(`daypass.${key}`)}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('daypass.validityPasaTarde')}
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {t('daypass.foodNotIncluded')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            {(adultRate > 0 || childrenRate > 0) && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">{t('daypass.pricingTitle')}</Typography>
                  <Typography variant="body2">{t('daypass.adultPrice', { price: formatMoney(adultRate) })}</Typography>
                  <Typography variant="body2">{t('daypass.childPrice', { price: formatMoney(childrenRate) })}</Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    {t('daypass.total', { price: formatMoney(calculateTotalPrice()) })}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
