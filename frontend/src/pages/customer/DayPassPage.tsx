import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  CheckCircle,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getCountriesForDisplay } from '../../utils/countries';
import { pricingService } from '../../services/api';
import { findApplicablePricing, PricingRule } from '../../utils/pricing';

interface DayPassData {
  visitDate: Date | null;
  guestDetails: {
    adults: number;
    children: number;
    infants: number;
  };
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
  };
  services: {
    breakfast: boolean;
    spa: boolean;
    aquaPark: boolean;
  };
  specialRequests: string;
}

const ADDON_PRICES = {
  breakfast: 25, // per person
  spa: 100, // per adult
  aquaPark: 30, // per person (adults & children)
};

const DayPassPage: React.FC = () => {
  const { t } = useTranslation();
  const [passType, setPassType] = useState<'daypass' | 'pasatarde'>('daypass');
  const [bookingData, setBookingData] = useState<DayPassData>({
    visitDate: new Date(),
    guestDetails: {
      adults: 1,
      children: 0,
      infants: 0,
    },
    contactInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
    },
    services: {
      breakfast: false,
      spa: false,
      aquaPark: false,
    },
    specialRequests: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [adultRate, setAdultRate] = useState<number>(0);
  const [childrenRate, setChildrenRate] = useState<number>(0);

  useEffect(() => {
    // Fetch pricing rules for selected pass type on change
    (async () => {
      try {
        const res = await pricingService.getPricing({ service: passType });
        const list = (res.data.data as any[]) || [];
        setPricingRules(list as PricingRule[]);
      } catch (e) {
        console.error('Failed to load pricing for', passType);
      }
    })();
  }, [passType]);

  useEffect(() => {
    // When visit date or pricing set changes, resolve applicable pricing
    if (!bookingData.visitDate || pricingRules.length === 0) return;
    const rule = findApplicablePricing(pricingRules, bookingData.visitDate);
    setAdultRate(rule?.adultPrice || 0);
    setChildrenRate(rule?.childrenPrice || 0);
  }, [bookingData.visitDate, pricingRules, passType]);

  const calculateTotalPrice = () => {
    const base = adultRate * bookingData.guestDetails.adults + childrenRate * bookingData.guestDetails.children;
    const addons =
      (bookingData.services.breakfast ? ADDON_PRICES.breakfast * (bookingData.guestDetails.adults + bookingData.guestDetails.children + bookingData.guestDetails.infants) : 0) +
      (bookingData.services.spa ? ADDON_PRICES.spa * bookingData.guestDetails.adults : 0) +
      (bookingData.services.aquaPark ? ADDON_PRICES.aquaPark * (bookingData.guestDetails.adults + bookingData.guestDetails.children) : 0);
    return Math.round((base + addons) * 100) / 100;
  };

  const handleSubmit = async () => {
    // Validation
    if (!bookingData.visitDate) {
      setError(t('daypass.errors.selectDate'));
      return;
    }
    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName) {
      setError(t('daypass.errors.nameRequired'));
      return;
    }
    if (!bookingData.contactInfo.email) {
      setError(t('daypass.errors.emailRequired'));
      return;
    }
    if (bookingData.guestDetails.adults < 1) {
      setError(t('daypass.errors.adultsRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedType: 'daypass' | 'PasaTarde' = passType === 'pasatarde' ? 'PasaTarde' : 'daypass';
      const reservationData = {
        type: selectedType,
        checkInDate: bookingData.visitDate?.toISOString(),
        guestDetails: {
          adults: bookingData.guestDetails.adults,
          children: bookingData.guestDetails.children,
          infants: bookingData.guestDetails.infants
        },
        // Include guest name for non-authenticated bookings
        guestName: {
          firstName: bookingData.contactInfo.firstName,
          lastName: bookingData.contactInfo.lastName
        },
        contactInfo: {
          phone: bookingData.contactInfo.phone,
          email: bookingData.contactInfo.email,
          country: bookingData.contactInfo.country,
        },
        services: {
          breakfast: bookingData.services.breakfast,
          spa: bookingData.services.spa,
          aquaPark: bookingData.services.aquaPark
        },
        specialRequests: bookingData.specialRequests,
        guests: bookingData.guestDetails.adults + bookingData.guestDetails.children + bookingData.guestDetails.infants,
      };

      // Use the unified reservations API instead of separate daypass API
      const response = await fetch('http://localhost:5001/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if user is logged in
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('daypass.errors.bookingFailed'));
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('daypass.errors.bookingFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="primary">
            {passType === 'pasatarde' ? t('daypass.successPasaTardeTitle') : t('daypass.successDaypassTitle')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {t('daypass.successBody', {
              product: passType === 'pasatarde' ? t('daypass.productPasaTarde') : t('daypass.productDayPass'),
              date: bookingData.visitDate ? format(bookingData.visitDate, 'MMMM dd, yyyy') : ''
            })}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/reservations'}
            sx={{ mr: 2 }}
          >
            {t('daypass.viewReservations')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSuccess(false);
              setBookingData(prev => ({
                ...prev,
                visitDate: null,
                services: { breakfast: false, spa: false, aquaPark: true }
              }));
            }}
          >
            {passType === 'pasatarde' ? t('daypass.bookAnotherPasaTarde') : t('daypass.bookAnotherDayPass')}
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: '40vh', md: '50vh' },
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&w=1200&q=80)',
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
            <Typography variant="h2" gutterBottom sx={{ fontWeight: 700, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {t('daypass.heroTitle')}
            </Typography>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 300, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {t('daypass.heroSubtitle')}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Booking Form */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Left Column - Booking Form */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h4" gutterBottom color="primary">
                    {passType === 'pasatarde' ? t('daypass.bookTitlePasaTarde') : t('daypass.bookTitle')}
                  </Typography>
                  <ToggleButtonGroup
                    value={passType}
                    exclusive
                    onChange={(e, val) => { if (val) setPassType(val); }}
                    size="small"
                  >
                    <ToggleButton value="daypass">{t('switcher.daypass')}</ToggleButton>
                    <ToggleButton value="pasatarde">{t('switcher.pasatarde')}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  {/* Visit Date */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('daypass.visitDate')}
                      type="date"
                      value={bookingData.visitDate ? format(bookingData.visitDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Create date with local timezone to avoid day-before issue
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          setBookingData(prev => ({ ...prev, visitDate: date }));
                        } else {
                          setBookingData(prev => ({ ...prev, visitDate: null }));
                        }
                      }}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }}
                    />
                  </Grid>

                  {/* Guest Distribution */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      {t('daypass.guestDistribution')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('daypass.adults')}
                      type="number"
                      value={bookingData.guestDetails.adults}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        guestDetails: { ...prev.guestDetails, adults: Math.max(1, parseInt(e.target.value) || 1) }
                      }))}
                      fullWidth
                      required
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('daypass.children')}
                      type="number"
                      value={bookingData.guestDetails.children}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        guestDetails: { ...prev.guestDetails, children: Math.max(0, parseInt(e.target.value) || 0) }
                      }))}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('daypass.infants')}
                      type="number"
                      value={bookingData.guestDetails.infants}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        guestDetails: { ...prev.guestDetails, infants: Math.max(0, parseInt(e.target.value) || 0) }
                      }))}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Grid>

                  {/* Contact Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      {t('daypass.contactInfo')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('daypass.firstName')}
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
                      label={t('daypass.lastName')}
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
                      label={t('daypass.email')}
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
                      label={t('daypass.phone')}
                      value={bookingData.contactInfo.phone}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, phone: e.target.value }
                      }))}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('daypass.country')}</InputLabel>
                      <Select
                        value={bookingData.contactInfo.country}
                        label="Country"
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

                  {/* Special Requests */}
                  <Grid item xs={12}>
                    <TextField
                      label={t('daypass.specialRequests')}
                      multiline
                      rows={3}
                      value={bookingData.specialRequests}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        specialRequests: e.target.value
                      }))}
                      placeholder={t('daypass.specialRequestsPlaceholder')}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={loading || !bookingData.visitDate}
                    sx={{
                      px: 6,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        Booking...
                      </>
                    ) : (
                      `${passType === 'pasatarde' ? t('daypass.bookButtonPasaTarde', { price: calculateTotalPrice() }) : t('daypass.bookButton', { price: calculateTotalPrice() })}`
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Summary & Info */}
          <Grid item xs={12} md={4}>
            {/* What's Included */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  {t('daypass.includedTitle')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip label={t('daypass.includedPool')} variant="outlined" />
                  <Chip label={t('daypass.includedParking')} variant="outlined" />
                  <Chip label={t('daypass.includedWifi')} variant="outlined" />
                  <Chip label={t('daypass.includedChangingRooms')} variant="outlined" />
                  <Chip label={t('daypass.includedLounge')} variant="outlined" />
                  <Chip label={t('daypass.includedAquaPark')} variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {passType === 'pasatarde' ? t('daypass.validityPasaTarde') : t('daypass.validityDayPass')}
                </Typography>
                {passType === 'pasatarde' && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {t('daypass.foodNotIncluded')}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t('daypass.currentRate', { adult: adultRate, child: childrenRate })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default DayPassPage;