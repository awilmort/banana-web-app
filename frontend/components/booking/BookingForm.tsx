'use client';

import NumberField from '@/components/common/NumberField';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Grid, Typography, Box, Alert, Stepper, Step, StepLabel, Divider,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Hotel, CheckCircle } from '@mui/icons-material';
import { Room, Reservation } from '@/types';
import { reservationsService, roomsService, pricingService } from '@/lib/api';
import { getCountriesForDisplay } from '@/utils/countries';
import { findApplicablePricing, PricingRule } from '@/utils/pricing';
import { formatMoney } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
  onBookingSuccess: (reservation: Reservation) => void;
}

const stepIds = ['selectDates', 'guestDetails', 'confirmation'] as const;

interface BookingData {
  checkInDate: Date | null;
  checkOutDate: Date | null;
  adults: number;
  children: number;
  infants: number;
  contactInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    emergencyContact?: string;
    country?: string;
  };
  specialRequests: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ open, onClose, room, onBookingSuccess }) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [adultRate, setAdultRate] = useState<number>(0);
  const [childrenRate, setChildrenRate] = useState<number>(0);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    checkInDate: null,
    checkOutDate: null,
    adults: 1,
    children: 0,
    infants: 0,
    contactInfo: { firstName: '', lastName: '', phone: '', email: '', emergencyContact: '', country: '' },
    specialRequests: '',
  });

  const checkAvailability = useCallback(async () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate || !room) return;
    setAvailabilityLoading(true);
    try {
      const response = await roomsService.checkAvailability(
        room._id,
        bookingData.checkInDate.toISOString(),
        bookingData.checkOutDate.toISOString()
      );
      setIsAvailable(response.data.data?.available || false);
    } catch {
      setIsAvailable(false);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [bookingData.checkInDate, bookingData.checkOutDate, room]);

  useEffect(() => {
    if (bookingData.checkInDate && bookingData.checkOutDate && room) checkAvailability();
  }, [bookingData.checkInDate, bookingData.checkOutDate, room, checkAvailability]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await pricingService.getPricing({ service: 'hospedaje' });
        setPricingRules((res.data.data as PricingRule[]) || []);
      } catch { /* ignore */ }
    })();

    (async () => {
      setDatesLoading(true);
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const response = await roomsService.getAvailableDates(fmt(start), fmt(end));
        if (response.data.success && response.data.data) {
          setUnavailableDates(new Set(response.data.data.unavailableDates));
        }
      } catch { /* ignore */ } finally {
        setDatesLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!bookingData.checkInDate || pricingRules.length === 0) return;
    const rule = findApplicablePricing(pricingRules, bookingData.checkInDate);
    setAdultRate(rule?.adultPrice || 0);
    setChildrenRate(rule?.childrenPrice || 0);
  }, [bookingData.checkInDate, pricingRules]);

  const handleNext = async () => {
    setError(null);
    if (activeStep === 0) {
      if (!bookingData.checkInDate || !bookingData.checkOutDate) {
        setError(t('pages.roomBooking.errors.selectBothDates'));
        return;
      }
      if (bookingData.checkOutDate <= bookingData.checkInDate) {
        setError(t('pages.roomBooking.errors.checkoutAfterCheckin'));
        return;
      }
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (bookingData.checkInDate < startOfToday) {
        setError(t('pages.roomBooking.errors.checkinInPast'));
        return;
      }
      if (isAvailable === false) {
        setError(t('pages.roomBooking.errors.notAvailable'));
        return;
      }
    }
    if (activeStep === 1) {
      if (bookingData.adults < 1) { setError(t('pages.roomBooking.errors.adultRequired')); return; }
      if (!bookingData.contactInfo.email) {
        setError(t('pages.roomBooking.errors.contactRequired'));
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(bookingData.contactInfo.email)) {
        setError(t('pages.roomBooking.errors.emailInvalid'));
        return;
      }
    }
    setActiveStep((s) => s + 1);
  };

  const calculateTotalPrice = () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate) return 0;
    const nights = Math.ceil(
      (bookingData.checkOutDate.getTime() - bookingData.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, Math.round((adultRate * bookingData.adults + childrenRate * bookingData.children) * nights * 100) / 100);
  };

  const handleSubmit = async () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate) return;
    setLoading(true);
    setError(null);
    try {
      const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
      const payload: Parameters<typeof reservationsService.createReservation>[0] = {
        type: 'room',
        checkInDate: bookingData.checkInDate.toISOString(),
        checkOutDate: bookingData.checkOutDate.toISOString(),
        guests: totalGuests,
        guestDetails: { adults: bookingData.adults, children: bookingData.children, infants: bookingData.infants },
        guestName: { firstName: bookingData.contactInfo.firstName, lastName: bookingData.contactInfo.lastName },
        contactInfo: {
          phone: bookingData.contactInfo.phone,
          email: bookingData.contactInfo.email,
          emergencyContact: bookingData.contactInfo.emergencyContact,
          ...(bookingData.contactInfo.country && { country: bookingData.contactInfo.country }),
        },
        services: { breakfast: false, airportTransfer: false, spa: false, aquaPark: false },
        specialRequests: bookingData.specialRequests,
        ...(room && { roomType: room.type }),
      };
      const res = await reservationsService.createReservation(payload);
      onBookingSuccess(res.data.data as Reservation);
      handleClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t('pages.roomBooking.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setBookingData({
      checkInDate: null, checkOutDate: null, adults: 1, children: 0, infants: 0,
      contactInfo: { firstName: '', lastName: '', phone: '', email: '', emergencyContact: '', country: '' },
      specialRequests: '',
    });
    setError(null);
    setIsAvailable(null);
    onClose();
  };

  const renderStep = (step: number) => {
    if (step === 0) return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h6" gutterBottom>{t('pages.roomBooking.selectStayDates')}</Typography>
        </Grid>
        {room && (
          <Grid size={12}>
            <Alert severity="info">
              {t('pages.roomBooking.bookingFor', { roomName: room.name, roomType: room.type })}
              {' '}• {t('pages.roomBooking.currentRatePerNight', { adult: formatMoney(adultRate), child: formatMoney(childrenRate) })}
            </Alert>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={t('pages.roomBooking.checkInDate')}
              value={bookingData.checkInDate ? dayjs(bookingData.checkInDate) : null}
              onChange={(v: Dayjs | null) => setBookingData({ ...bookingData, checkInDate: v?.isValid() ? v.toDate() : null })}
              shouldDisableDate={(d: Dayjs) => {
                if (d.isBefore(dayjs().startOf('day'))) return true;
                return unavailableDates.has(d.format('YYYY-MM-DD'));
              }}
              loading={datesLoading}
              disabled={datesLoading}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={t('pages.roomBooking.checkOutDate')}
              value={bookingData.checkOutDate ? dayjs(bookingData.checkOutDate) : null}
              onChange={(v: Dayjs | null) => setBookingData({ ...bookingData, checkOutDate: v?.isValid() ? v.toDate() : null })}
              shouldDisableDate={(d: Dayjs) => {
                if (d.isBefore(dayjs().startOf('day'))) return true;
                if (bookingData.checkInDate) {
                  const ci = dayjs(bookingData.checkInDate).startOf('day');
                  if (d.isSame(ci, 'day') || d.isBefore(ci)) return true;
                }
                return false;
              }}
              loading={datesLoading}
              disabled={datesLoading || !bookingData.checkInDate}
              minDate={bookingData.checkInDate ? dayjs(bookingData.checkInDate).add(1, 'day') : undefined}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </LocalizationProvider>
        </Grid>
        {availabilityLoading && (
          <Grid size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">{t('pages.roomBooking.checkingAvailability')}</Typography>
            </Box>
          </Grid>
        )}
        {isAvailable === true && <Grid size={12}><Alert severity="success">{t('pages.roomBooking.available')}</Alert></Grid>}
        {isAvailable === false && <Grid size={12}><Alert severity="error">{t('pages.roomBooking.notAvailable')}</Alert></Grid>}
      </Grid>
    );

    if (step === 1) return (
      <Grid container spacing={3}>
        <Grid size={12}><Typography variant="h6" gutterBottom>{t('pages.roomBooking.guestInfo')}</Typography></Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberField fullWidth label={t('pages.roomBooking.adults')} value={bookingData.adults}
            onChange={(v) => setBookingData({ ...bookingData, adults: v ?? 1 })} min={1} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberField fullWidth label={t('pages.roomBooking.children')} value={bookingData.children}
            onChange={(v) => setBookingData({ ...bookingData, children: v ?? 0 })} min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <NumberField fullWidth label={t('pages.roomBooking.infants')} value={bookingData.infants}
            onChange={(v) => setBookingData({ ...bookingData, infants: v ?? 0 })} min={0} />
        </Grid>
        <Grid size={12}><Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>{t('pages.roomBooking.contactInfo')}</Typography></Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth required label={t('pages.roomBooking.firstName')} value={bookingData.contactInfo.firstName}
            onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, firstName: e.target.value } })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth required label={t('pages.roomBooking.lastName')} value={bookingData.contactInfo.lastName}
            onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, lastName: e.target.value } })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={t('pages.roomBooking.phone')} value={bookingData.contactInfo.phone}
            onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, phone: e.target.value } })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth required type="email" label={t('pages.roomBooking.email')} value={bookingData.contactInfo.email}
            onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, email: e.target.value } })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel>{t('pages.roomBooking.country')}</InputLabel>
            <Select value={bookingData.contactInfo.country || ''}
              onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, country: e.target.value } })}>
              {getCountriesForDisplay().map((c) => (
                <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={t('pages.roomBooking.emergencyContact')} value={bookingData.contactInfo.emergencyContact || ''}
            onChange={(e) => setBookingData({ ...bookingData, contactInfo: { ...bookingData.contactInfo, emergencyContact: e.target.value } })} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth multiline rows={4} label={t('pages.roomBooking.specialRequests')} value={bookingData.specialRequests}
            onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
            placeholder={t('pages.roomBooking.specialRequestsPlaceholder')} />
        </Grid>
      </Grid>
    );

    if (step === 2) {
      const nights = bookingData.checkInDate && bookingData.checkOutDate
        ? Math.ceil((bookingData.checkOutDate.getTime() - bookingData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
      const totalPrice = calculateTotalPrice();

      return (
        <Grid container spacing={3}>
          <Grid size={12}><Typography variant="h6" gutterBottom>{t('pages.roomBooking.confirmationTitle')}</Typography></Grid>
          <Grid size={12}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" gutterBottom>
                <Hotel sx={{ mr: 1, verticalAlign: 'bottom' }} />{room?.name}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">{t('pages.roomBooking.labels.checkin')}</Typography>
                  <Typography variant="body1">{bookingData.checkInDate?.toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">{t('pages.roomBooking.labels.checkout')}</Typography>
                  <Typography variant="body1">{bookingData.checkOutDate?.toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">{t('pages.roomBooking.labels.duration')}</Typography>
                  <Typography variant="body1">{nights} {t('pages.roomBooking.labels.nights', { count: nights })}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">{t('pages.roomBooking.labels.guests')}</Typography>
                  <Typography variant="body1">{totalGuests}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">{t('pages.roomBooking.total')}</Typography>
                <Typography variant="subtitle1" color="primary">{formatMoney(totalPrice)}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Hotel />
          <Typography variant="h6">
            {room ? t('pages.roomBooking.modalTitleWithRoom', { name: room.name }) : t('pages.roomBooking.modalTitle')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {stepIds.map((id) => (
              <Step key={id}><StepLabel>{t(`pages.roomBooking.steps.${id}`)}</StepLabel></Step>
            ))}
          </Stepper>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {renderStep(activeStep)}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>{t('pages.roomBooking.actions.cancel')}</Button>
        {activeStep !== 0 && <Button onClick={() => setActiveStep((s) => s - 1)}>{t('pages.roomBooking.actions.back')}</Button>}
        {activeStep < stepIds.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={availabilityLoading || (activeStep === 0 && isAvailable === false)}>
            {t('pages.roomBooking.actions.next')}
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}>
            {loading ? t('pages.roomBooking.actions.processing') : t('pages.roomBooking.actions.confirmBooking')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BookingForm;
