'use client';

import NumberField from '@/components/common/NumberField';
import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stepper, Step, StepLabel, Button, Grid,
  TextField, FormControlLabel, Checkbox, Alert, Chip, Paper, IconButton,
} from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { format } from 'date-fns';
import SingleDatePicker from '@/components/common/SingleDatePicker';
import { reservationsService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';

interface EventBookingFormProps {
  eventType: string;
  eventData?: {
    title: string;
    priceFrom: number;
    maxGuests: number;
    maxChildren?: number;
    maxAdults?: number;
    features: string[];
  };
  onCancel: () => void;
}

interface BookingData {
  eventType: string;
  eventDescription: string;
  expectedAttendees: number;
  eventDate: Date | null;
  endDate: Date | null;
  guestDetails: { adults: number; children: number; infants: number };
  contactInfo: { firstName: string; lastName: string; phone: string; email: string; emergencyContact: string; country: string };
  services: { catering: boolean; decoration: boolean; photography: boolean; musicSystem: boolean; breakfast: boolean; spa: boolean; aquaPark: boolean };
  specialRequests: string;
}

const EventBookingForm: React.FC<EventBookingFormProps> = ({ eventType, eventData, onCancel }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    eventType,
    eventDescription: '',
    expectedAttendees: 1,
    eventDate: null,
    endDate: null,
    guestDetails: { adults: 1, children: 0, infants: 0 },
    contactInfo: { firstName: '', lastName: '', phone: '', email: user?.email || '', emergencyContact: '', country: '' },
    services: { catering: false, decoration: false, photography: false, musicSystem: false, breakfast: false, spa: false, aquaPark: false },
    specialRequests: '',
  });

  useEffect(() => { setBookingData(prev => ({ ...prev, eventType })); }, [eventType]);

  const stepIds = ['eventDetails', 'contactInfo', 'servicesExtras', 'confirmation'] as const;

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: {
        const total = bookingData.guestDetails.adults + bookingData.guestDetails.children + bookingData.guestDetails.infants;
        const childrenOk = eventData?.maxChildren === undefined || bookingData.guestDetails.children <= (eventData.maxChildren || 0);
        const adultsOk = eventData?.maxAdults === undefined || bookingData.guestDetails.adults <= (eventData.maxAdults || 0);
        return !!(bookingData.eventDate && total > 0 && bookingData.guestDetails.adults > 0 && childrenOk && adultsOk && bookingData.eventDescription.trim());
      }
      case 1:
        return !!(bookingData.contactInfo.firstName && bookingData.contactInfo.lastName && bookingData.contactInfo.email && bookingData.contactInfo.email.includes('@'));
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) { setCurrentStep(p => p + 1); setError(null); }
    else setError(t('pages.eventBooking.errors.requiredFields'));
  };

  const handleBack = () => { setCurrentStep(p => p - 1); setError(null); };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        type: 'event' as const,
        eventType: bookingData.eventType,
        eventDescription: bookingData.eventDescription,
        expectedAttendees: bookingData.expectedAttendees,
        checkInDate: bookingData.eventDate || new Date(),
        checkOutDate: bookingData.endDate || undefined,
        guests: bookingData.expectedAttendees,
        guestDetails: bookingData.guestDetails,
        guestName: { firstName: bookingData.contactInfo.firstName, lastName: bookingData.contactInfo.lastName },
        contactInfo: bookingData.contactInfo,
        services: bookingData.services,
        specialRequests: bookingData.specialRequests,
        totalPrice: 0,
      };
      await reservationsService.createReservation(payload as Parameters<typeof reservationsService.createReservation>[0]);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t('pages.eventBooking.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h4" gutterBottom color="primary">🎉 {t('pages.eventBooking.successTitle')}</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>{t('pages.eventBooking.successBody')}</Typography>
          <Button variant="contained" onClick={() => router.push(`/${lang}/profile`)} sx={{ mr: 2 }}>
            {t('pages.eventBooking.viewReservations')}
          </Button>
          <Button variant="outlined" onClick={onCancel}>{t('pages.eventBooking.bookAnother')}</Button>
        </CardContent>
      </Card>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={12}><Typography variant="h6" gutterBottom>{t('pages.eventBooking.eventDetails')}</Typography></Grid>
            <Grid size={12}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 500, mb: 1 }}>
                {t('pages.eventBooking.eventDate')} *
              </Typography>
              <SingleDatePicker
                value={bookingData.eventDate ? format(bookingData.eventDate, 'yyyy-MM-dd') : ''}
                onChange={(dateStr) => {
                  if (dateStr) {
                    const [y, m, d] = dateStr.split('-').map(Number);
                    setBookingData(prev => ({ ...prev, eventDate: new Date(y, m - 1, d) }));
                  } else {
                    setBookingData(prev => ({ ...prev, eventDate: null }));
                  }
                }}
                minDate={format(new Date(), 'yyyy-MM-dd')}
              />
            </Grid>
            {!showEndDate && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Button variant="outlined" onClick={() => setShowEndDate(true)} sx={{ mt: { xs: 2, md: 0 } }}>
                  {t('pages.eventBooking.addEndDate')}
                </Button>
              </Grid>
            )}
            {showEndDate && (
              <Grid size={12}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 500, mb: 1 }}>
                      {t('pages.eventBooking.endDate')}
                    </Typography>
                    <SingleDatePicker
                      value={bookingData.endDate ? format(bookingData.endDate, 'yyyy-MM-dd') : ''}
                      onChange={(dateStr) => {
                        if (dateStr) {
                          const [y, m, d] = dateStr.split('-').map(Number);
                          setBookingData(prev => ({ ...prev, endDate: new Date(y, m - 1, d) }));
                        } else {
                          setBookingData(prev => ({ ...prev, endDate: null }));
                        }
                      }}
                      minDate={bookingData.eventDate ? format(bookingData.eventDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                    />
                    <Typography variant="caption" color="text.secondary">{t('pages.eventBooking.endDateHelper')}</Typography>
                  </Box>
                  <IconButton aria-label={t('pages.eventBooking.removeEndDate')} color="error"
                    onClick={() => { setBookingData(prev => ({ ...prev, endDate: null })); setShowEndDate(false); }}>
                    <DeleteOutlined />
                  </IconButton>
                </Box>
              </Grid>
            )}
            <Grid size={12}><Typography variant="h6" gutterBottom sx={{ mt: 2 }}>{t('common.guestDistribution')}</Typography></Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberField label={t('pages.eventBooking.adults')} value={bookingData.guestDetails.adults} min={1} max={eventData?.maxAdults} fullWidth required
                onChange={(val) => { const adults = val ?? 0; const total = adults + bookingData.guestDetails.children + bookingData.guestDetails.infants; setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, adults }, expectedAttendees: total })); }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberField label={t('pages.eventBooking.children')} value={bookingData.guestDetails.children} min={0} max={eventData?.maxChildren} fullWidth
                onChange={(val) => { const children = val ?? 0; const total = bookingData.guestDetails.adults + children + bookingData.guestDetails.infants; setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, children }, expectedAttendees: total })); }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <NumberField label={t('pages.eventBooking.infants')} value={bookingData.guestDetails.infants} min={0} fullWidth
                onChange={(val) => { const infants = val ?? 0; const total = bookingData.guestDetails.adults + bookingData.guestDetails.children + infants; setBookingData(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, infants }, expectedAttendees: total })); }} />
            </Grid>
            <Grid size={12}>
              <TextField label={t('pages.eventBooking.eventDescription')} multiline rows={4} fullWidth required
                placeholder={t('pages.eventBooking.eventDescriptionPlaceholder')}
                value={bookingData.eventDescription}
                onChange={(e) => setBookingData(prev => ({ ...prev, eventDescription: e.target.value }))} />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={12}><Typography variant="h6" gutterBottom>{t('pages.eventBooking.contactInfo')}</Typography></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label={t('pages.eventBooking.firstName')} value={bookingData.contactInfo.firstName}
                onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, firstName: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label={t('pages.eventBooking.lastName')} value={bookingData.contactInfo.lastName}
                onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, lastName: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={t('pages.eventBooking.phone')} value={bookingData.contactInfo.phone}
                onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, phone: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required type="email" label={t('pages.eventBooking.email')} value={bookingData.contactInfo.email}
                onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, email: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={t('pages.eventBooking.emergencyContact')} value={bookingData.contactInfo.emergencyContact}
                onChange={(e) => setBookingData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, emergencyContact: e.target.value } }))} />
            </Grid>

          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>{t('pages.eventBooking.additionalServices')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('pages.eventBooking.additionalServicesBody')}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>{t('pages.eventBooking.eventServices')}</Typography>
                {(['catering', 'decoration', 'photography', 'musicSystem'] as const).map((key) => (
                  <FormControlLabel key={key}
                    control={<Checkbox checked={bookingData.services[key]} onChange={(e) => setBookingData(prev => ({ ...prev, services: { ...prev.services, [key]: e.target.checked } }))} />}
                    label={<Typography variant="body2">{t(`pages.eventBooking.services.${key}`)}</Typography>} />
                ))}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>{t('pages.eventBooking.resortAmenities')}</Typography>
                {(['breakfast', 'spa', 'aquaPark'] as const).map((key) => (
                  <FormControlLabel key={key}
                    control={<Checkbox checked={bookingData.services[key]} onChange={(e) => setBookingData(prev => ({ ...prev, services: { ...prev.services, [key]: e.target.checked } }))} />}
                    label={<Typography variant="body2">{t(`pages.eventBooking.services.${key}`)}</Typography>} />
                ))}
              </Paper>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline rows={3} label={t('pages.eventBooking.specialRequests')}
                placeholder={t('pages.eventBooking.specialRequestsPlaceholder')}
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))} />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={12}><Typography variant="h6" gutterBottom>{t('pages.eventBooking.bookingSummary')}</Typography></Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">{t('pages.eventBooking.eventTitle', { title: eventData?.title })}</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{t('pages.eventBooking.labels.date')}</strong>{' '}
                  {bookingData.eventDate ? format(bookingData.eventDate, 'MMMM dd, yyyy') : t('pages.eventBooking.labels.notSelected')}
                  {bookingData.endDate && ` - ${format(bookingData.endDate, 'MMMM dd, yyyy')}`}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{t('pages.eventBooking.labels.attendees')}</strong> {bookingData.expectedAttendees} {t('pages.eventBooking.labels.guests')}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{t('pages.eventBooking.labels.description')}</strong> {bookingData.eventDescription || t('pages.eventBooking.labels.noneProvided')}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{t('pages.eventBooking.labels.contact')}</strong> {bookingData.contactInfo.email} • {bookingData.contactInfo.phone}
                </Typography>
                {Object.values(bookingData.services).some(Boolean) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>{t('pages.eventBooking.selectedServices')}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {(Object.entries(bookingData.services) as [string, boolean][]).filter(([, v]) => v).map(([key]) => (
                        <Chip key={key} label={t(`pages.eventBooking.serviceLabels.${key}`)} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        );

      default: return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        {t('pages.eventBooking.bookYourEvent', { title: eventData?.title })}
      </Typography>
      <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
        {stepIds.map((id) => <Step key={id}><StepLabel>{t(`pages.eventBooking.steps.${id}`)}</StepLabel></Step>)}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent()}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Box>
              {currentStep > 0 && <Button onClick={handleBack} sx={{ mr: 1 }}>{t('pages.eventBooking.actions.back')}</Button>}
              <Button variant="outlined" onClick={onCancel}>{t('pages.eventBooking.actions.cancel')}</Button>
            </Box>
            <Box>
              {currentStep < stepIds.length - 1 ? (
                <Button variant="contained" onClick={handleNext} disabled={!validateStep(currentStep)}>
                  {t('pages.eventBooking.actions.next')}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleSubmit} disabled={loading || !validateStep(currentStep)}>
                  {loading ? t('pages.eventBooking.actions.booking') : t('pages.eventBooking.actions.confirmBooking')}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EventBookingForm;
