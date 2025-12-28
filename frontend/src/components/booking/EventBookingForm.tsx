import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  Chip,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { format } from 'date-fns';
import { reservationsService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getCountriesForDisplay } from '../../utils/countries';
import { useTranslation } from 'react-i18next';

interface EventBookingFormProps {
  eventType: 'wedding' | 'conference' | 'birthday' | 'corporate' | 'other';
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
  // Event details
  eventType: 'wedding' | 'conference' | 'birthday' | 'corporate' | 'other';
  eventDescription: string;
  expectedAttendees: number;

  // Dates
  eventDate: Date | null;
  endDate: Date | null;

  // Guest details
  guestDetails: {
    adults: number;
    children: number;
    infants: number;
  };

  // Contact info
  contactInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    emergencyContact: string;
    country: string;
  };

  // Services
  services: {
    catering: boolean;
    decoration: boolean;
    photography: boolean;
    musicSystem: boolean;
    breakfast: boolean;
    spa: boolean;
    aquaPark: boolean;
  };

  // Special requests
  specialRequests: string;
}

const EventBookingForm: React.FC<EventBookingFormProps> = ({
  eventType,
  eventData,
  onCancel,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEndDate, setShowEndDate] = useState<boolean>(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    eventType,
    eventDescription: '',
    expectedAttendees: 1,
    eventDate: null,
    endDate: null,
    guestDetails: {
      adults: 1,
      children: 0,
      infants: 0,
    },
    contactInfo: {
      firstName: '',
      lastName: '',
      phone: '',
      email: user?.email || '',
      emergencyContact: '',
      country: '',
    },
    services: {
      catering: false,
      decoration: false,
      photography: false,
      musicSystem: false,
      breakfast: false,
      spa: false,
      aquaPark: false,
    },
    specialRequests: '',
  });

  // Keep internal eventType in sync with the selected type from parent
  useEffect(() => {
    setBookingData(prev => ({ ...prev, eventType }));
  }, [eventType]);

  const stepIds = ['eventDetails', 'contactInfo', 'servicesExtras', 'confirmation'] as const;

  const calculateTotalPrice = () => {
    const basePrice = eventData?.priceFrom || 500;
    let total = basePrice;

    // Add service costs
    if (bookingData.services.catering) total += 50 * bookingData.expectedAttendees;
    if (bookingData.services.decoration) total += 300;
    if (bookingData.services.photography) total += 500;
    if (bookingData.services.musicSystem) total += 200;
    if (bookingData.services.breakfast) total += 25 * bookingData.expectedAttendees;
    if (bookingData.services.spa) total += 100 * bookingData.guestDetails.adults;
    if (bookingData.services.aquaPark) total += 30 * (bookingData.guestDetails.adults + bookingData.guestDetails.children);

    // Multi-day event multiplier
    if (bookingData.endDate && bookingData.eventDate) {
      const days = Math.ceil((bookingData.endDate.getTime() - bookingData.eventDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      total *= days;
    }

    return total;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        {
          const totalBreakdown = bookingData.guestDetails.adults + bookingData.guestDetails.children + bookingData.guestDetails.infants;
          const childrenWithinLimit = (eventData?.maxChildren === undefined) || (bookingData.guestDetails.children <= (eventData?.maxChildren || 0));
          const adultsWithinLimit = (eventData?.maxAdults === undefined) || (bookingData.guestDetails.adults <= (eventData?.maxAdults || 0));
          return !!(
            bookingData.eventDate &&
            totalBreakdown > 0 &&
            bookingData.guestDetails.adults > 0 &&
            childrenWithinLimit && adultsWithinLimit &&
            bookingData.eventDescription.trim()
          );
        }
      case 1:
        return !!(
          bookingData.contactInfo.firstName &&
          bookingData.contactInfo.lastName &&
          bookingData.contactInfo.phone &&
          bookingData.contactInfo.email &&
          bookingData.contactInfo.email.includes('@')
        );
      case 2:
        return true; // Services are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    } else {
      setError(t('pages.eventBooking.errors.requiredFields'));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const reservationData = {
        type: 'event' as const,
        eventType: bookingData.eventType,
        eventDescription: bookingData.eventDescription,
        expectedAttendees: bookingData.expectedAttendees,
        checkInDate: bookingData.eventDate || new Date(),
        checkOutDate: bookingData.endDate || undefined,
        guests: bookingData.expectedAttendees,
        guestDetails: bookingData.guestDetails,
        contactInfo: bookingData.contactInfo,
        services: bookingData.services,
        specialRequests: bookingData.specialRequests,
        totalPrice: calculateTotalPrice(),
      };
      // Always include the guestName from contact info for clarity in emails
      (reservationData as any).guestName = {
        firstName: bookingData.contactInfo.firstName,
        lastName: bookingData.contactInfo.lastName,
      };

      await reservationsService.createReservation(reservationData as any);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('pages.eventBooking.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h4" gutterBottom color="primary">
            🎉 {t('pages.eventBooking.successTitle')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {t('pages.eventBooking.successBody')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/profile'}
            sx={{ mr: 2 }}
          >
            {t('pages.eventBooking.viewReservations')}
          </Button>
          <Button variant="outlined" onClick={onCancel}>
            {t('pages.eventBooking.bookAnother')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('pages.eventBooking.eventDetails')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.eventDate')}
                type="date"
                value={bookingData.eventDate ? format(bookingData.eventDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Create date with local timezone to avoid day-before issue
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    setBookingData(prev => ({ ...prev, eventDate: date }));
                  } else {
                    setBookingData(prev => ({ ...prev, eventDate: null }));
                  }
                }}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }}
              />
            </Grid>

            {!showEndDate && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={() => setShowEndDate(true)}
                  sx={{ mt: { xs: 2, md: 0 } }}
                >
                  {t('pages.eventBooking.addEndDate')}
                </Button>
              </Grid>
            )}

            {showEndDate && (
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    label={t('pages.eventBooking.endDate')}
                    type="date"
                    value={bookingData.endDate ? format(bookingData.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        // Create date with local timezone to avoid day-before issue
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        setBookingData(prev => ({ ...prev, endDate: date }));
                      } else {
                        setBookingData(prev => ({ ...prev, endDate: null }));
                      }
                    }}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={t('pages.eventBooking.endDateHelper')}
                    inputProps={{
                      min: bookingData.eventDate ? format(bookingData.eventDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
                    }}
                  />
                  <IconButton
                    aria-label={t('pages.eventBooking.removeEndDate')}
                    color="error"
                    onClick={() => {
                      setBookingData(prev => ({ ...prev, endDate: null }));
                      setShowEndDate(false);
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {t('pages.eventBooking.guestDistribution')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label={t('pages.eventBooking.adults')}
                type="number"
                value={bookingData.guestDetails.adults}
                onChange={(e) => {
                  const adults = parseInt(e.target.value) || 0;
                  const total = adults + bookingData.guestDetails.children + bookingData.guestDetails.infants;
                  setBookingData(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, adults },
                    expectedAttendees: total
                  }));
                }}
                inputProps={{ min: 1, max: eventData?.maxAdults ?? undefined }}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label={t('pages.eventBooking.children')}
                type="number"
                value={bookingData.guestDetails.children}
                onChange={(e) => {
                  const children = parseInt(e.target.value) || 0;
                  const total = bookingData.guestDetails.adults + children + bookingData.guestDetails.infants;
                  setBookingData(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, children },
                    expectedAttendees: total
                  }));
                }}
                inputProps={{ min: 0, max: eventData?.maxChildren ?? undefined }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label={t('pages.eventBooking.infants')}
                type="number"
                value={bookingData.guestDetails.infants}
                onChange={(e) => {
                  const infants = parseInt(e.target.value) || 0;
                  const total = bookingData.guestDetails.adults + bookingData.guestDetails.children + infants;
                  setBookingData(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, infants },
                    expectedAttendees: total
                  }));
                }}
                inputProps={{ min: 0 }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label={t('pages.eventBooking.eventDescription')}
                multiline
                rows={4}
                value={bookingData.eventDescription}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  eventDescription: e.target.value
                }))}
                placeholder={t('pages.eventBooking.eventDescriptionPlaceholder')}
                fullWidth
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('pages.eventBooking.contactInfo')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.firstName')}
                value={bookingData.contactInfo.firstName}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, firstName: e.target.value }
                }))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.lastName')}
                value={bookingData.contactInfo.lastName}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, lastName: e.target.value }
                }))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.phone')}
                value={bookingData.contactInfo.phone}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, phone: e.target.value }
                }))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.email')}
                type="email"
                value={bookingData.contactInfo.email}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, email: e.target.value }
                }))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('pages.eventBooking.emergencyContact')}
                value={bookingData.contactInfo.emergencyContact}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, emergencyContact: e.target.value }
                }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('pages.eventBooking.country')}</InputLabel>
                <Select
                  value={bookingData.contactInfo.country}
                  label={t('pages.eventBooking.country')}
                  onChange={(e) => setBookingData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, country: e.target.value }
                  }))}
                >
                  {getCountriesForDisplay().map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Guest Distribution moved to Event Details step */}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('pages.eventBooking.additionalServices')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('pages.eventBooking.additionalServicesBody')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('pages.eventBooking.eventServices')}
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.catering}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, catering: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.catering')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.cateringPrice')}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.decoration}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, decoration: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.decoration')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.decorationPrice')}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.photography}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, photography: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.photography')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.photographyPrice')}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.musicSystem}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, musicSystem: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.musicSystem')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.musicSystemPrice')}
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('pages.eventBooking.resortAmenities')}
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.breakfast}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, breakfast: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.breakfast')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.breakfastPrice')}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.spa}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, spa: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.spa')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.spaPrice')}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bookingData.services.aquaPark}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        services: { ...prev.services, aquaPark: e.target.checked }
                      }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{t('pages.eventBooking.services.aquaPark')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.eventBooking.services.aquaParkPrice')}
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label={t('pages.eventBooking.specialRequests')}
                multiline
                rows={3}
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData(prev => ({
                  ...prev,
                  specialRequests: e.target.value
                }))}
                placeholder={t('pages.eventBooking.specialRequestsPlaceholder')}
                fullWidth
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('pages.eventBooking.bookingSummary')}
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {t('pages.eventBooking.eventTitle', { title: eventData?.title })}
                </Typography>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{t('pages.eventBooking.labels.date')}</strong> {bookingData.eventDate ? format(bookingData.eventDate, 'MMMM dd, yyyy') : t('pages.eventBooking.labels.notSelected')}
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
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                      {t('pages.eventBooking.selectedServices')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(bookingData.services).map(([key, value]) =>
                        value && (
                          <Chip
                            key={key}
                            label={t(`pages.eventBooking.serviceLabels.${key}`)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )
                      )}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  {t('pages.eventBooking.priceSummary')}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{t('pages.eventBooking.basePrice')}</Typography>
                  <Typography>${eventData?.priceFrom || 500}</Typography>
                </Box>

                {bookingData.services.catering && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{t('pages.eventBooking.labels.catering')}:</Typography>
                    <Typography variant="body2">${50 * bookingData.expectedAttendees}</Typography>
                  </Box>
                )}

                {Object.entries(bookingData.services).map(([key, value]) => {
                  if (!value || key === 'catering') return null;
                  let price = 0;
                  if (key === 'decoration') price = 300;
                  if (key === 'photography') price = 500;
                  if (key === 'musicSystem') price = 200;
                  if (key === 'breakfast') price = 25 * bookingData.expectedAttendees;
                  if (key === 'spa') price = 100 * bookingData.guestDetails.adults;
                  if (key === 'aquaPark') price = 30 * (bookingData.guestDetails.adults + bookingData.guestDetails.children);

                  return (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t(`pages.eventBooking.serviceLabels.${key}`)}:
                      </Typography>
                      <Typography variant="body2">${price}</Typography>
                    </Box>
                  );
                })}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('pages.eventBooking.total')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ${calculateTotalPrice()}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {t('pages.eventBooking.finalPriceNote')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        {t('pages.eventBooking.bookYourEvent', { title: eventData?.title })}
      </Typography>

      <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
        {stepIds.map((id) => (
          <Step key={id}>
            <StepLabel>{t(`pages.eventBooking.steps.${id}`)}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Box>
              {currentStep > 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  {t('pages.eventBooking.actions.back')}
                </Button>
              )}
              <Button variant="outlined" onClick={onCancel}>
                {t('pages.eventBooking.actions.cancel')}
              </Button>
            </Box>

            <Box>
              {currentStep < stepIds.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                >
                  {t('pages.eventBooking.actions.next')}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading || !validateStep(currentStep)}
                >
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
