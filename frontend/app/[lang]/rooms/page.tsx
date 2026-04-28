'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Dialog, DialogContent, DialogTitle,
  DialogActions, IconButton, Divider, TextField, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert, Popover,
} from '@mui/material';
import {
  Star, Pool, Waves, Park, AcUnit, Wifi, FreeBreakfast, LocalParking,
  FitnessCenter, Celebration, SupportAgent, Add, Remove, CheckCircle,
  ArrowBack, KingBed, Shower, BeachAccess, GridView, Close, Restaurant,
  LocalBar, ChevronLeft, ChevronRight, Nature, DinnerDining, OutdoorGrill,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Room, Reservation } from '@/types';
import { roomsService, pricingService, reservationsService, resolveMediaUrl } from '@/lib/api';
import { findApplicablePricing, PricingRule } from '@/utils/pricing';
import { formatMoney } from '@/utils/currency';
import { getCountriesForDisplay } from '@/utils/countries';
import DateRangePicker from '@/components/common/DateRangePicker';

// ─── Hardcoded amenity definitions ─────────────────────────────────────────
// First 5 → left column, next 5 → right column (via column-flow grid)
// Remaining items shown only in the "Show all" modal
const AMENITIES_PREVIEW = [
  // Left column
  { icon: <Pool />, key: 'pool' },
  { icon: <Nature />, key: 'ecoVilla' },
  { icon: <Park />, key: 'gardens' },
  { icon: <Wifi />, key: 'wifi' },
  { icon: <LocalParking />, key: 'parking' },
  // Right column
  { icon: <Waves />, key: 'aquaPark' },
  { icon: <AcUnit />, key: 'airConditioning' },
  { icon: <Shower />, key: 'hotWater' },
  { icon: <FreeBreakfast />, key: 'breakfast' },
  { icon: <DinnerDining />, key: 'buffet' },
];

const AMENITIES_ALL = [
  ...AMENITIES_PREVIEW,
  { icon: <KingBed />, key: 'kingBeds' },
  { icon: <BeachAccess />, key: 'outdoorSpaces' },
  { icon: <OutdoorGrill />, key: 'bbq' },
  { icon: <LocalBar />, key: 'laundry' },
];

// ─── Photos ─────────────────────────────────────────────────────────────────
const PHOTOS = [
  { src: '/images/villa.png', altKey: 'pages.rooms.photo1Alt' },
  { src: '/images/home.jpg', altKey: 'pages.rooms.photo2Alt' },
  { src: '/images/aqua-park.png', altKey: 'pages.rooms.photo3Alt' },
  { src: '/images/wedding.jpg', altKey: 'pages.rooms.photo4Alt' },
  { src: '/images/villa.png', altKey: 'pages.rooms.photo5Alt' },
];

// ─── Date helpers ────────────────────────────────────────────────────────────
const toDateStr = (d: Date | null): string => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fromDateStr = (s: string): Date | null => {
  if (!s) return null;
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d);
};

// ─── Types ──────────────────────────────────────────────────────────────────
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
    emergencyContact: string;
    country: string;
  };
  specialRequests: string;
}

const INITIAL_BOOKING: BookingData = {
  checkInDate: null,
  checkOutDate: null,
  adults: 1,
  children: 0,
  infants: 0,
  contactInfo: { firstName: '', lastName: '', phone: '', email: '', emergencyContact: '', country: '' },
  specialRequests: '',
};

// ─── Page component ──────────────────────────────────────────────────────────
export default function RoomsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';
  const { t } = useTranslation();

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [adultRate, setAdultRate] = useState<number>(0);
  const [childrenRate, setChildrenRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [bookingData, setBookingData] = useState<BookingData>(INITIAL_BOOKING);
  const [bookingPhase, setBookingPhase] = useState<'dates' | 'info'>('dates');
  const [submitting, setSubmitting] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // UI state
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [guestsAnchorEl, setGuestsAnchorEl] = useState<HTMLElement | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  // ─── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, pricingRes] = await Promise.all([
          roomsService.getRooms({ available: true }),
          pricingService.getPricing({ service: 'hospedaje' }),
        ]);
        setRooms(roomsRes.data.data?.rooms || []);
        setPricingRules((pricingRes.data.data as PricingRule[]) || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();

  }, []);

  // ─── Update rates when check-in changes ──────────────────────────────────
  useEffect(() => {
    if (!bookingData.checkInDate || pricingRules.length === 0) return;
    const rule = findApplicablePricing(pricingRules, bookingData.checkInDate);
    setAdultRate(rule?.adultPrice || 0);
    setChildrenRate(rule?.childrenPrice || 0);
  }, [bookingData.checkInDate, pricingRules]);

  // ─── Availability check ───────────────────────────────────────────────────
  const checkAvailability = useCallback(async () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate) return;
    setAvailabilityLoading(true);
    setBookingError(null);
    let proceed = true;
    try {
      if (rooms.length > 0) {
        const res = await roomsService.checkAvailability(
          rooms[0]._id,
          bookingData.checkInDate.toISOString(),
          bookingData.checkOutDate.toISOString(),
        );
        if (res.data.data?.available === false) {
          setIsAvailable(false);
          proceed = false;
        } else {
          setIsAvailable(true);
        }
      }
      // rooms.length === 0: can't check, proceed and let server validate
    } catch {
      // API error: proceed and let server validate on submission
    } finally {
      setAvailabilityLoading(false);
    }
    if (proceed) {
      setBookingPhase('info');
      setTimeout(() => {
        document.getElementById('booking-info-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [bookingData.checkInDate, bookingData.checkOutDate, rooms]);

  // ─── Derived calculations ─────────────────────────────────────────────────
  const nights =
    bookingData.checkInDate && bookingData.checkOutDate
      ? Math.max(
          0,
          Math.ceil(
            (bookingData.checkOutDate.getTime() - bookingData.checkInDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const totalPrice =
    nights > 0
      ? Math.round(
          (adultRate * bookingData.adults + childrenRate * bookingData.children) * nights * 100,
        ) / 100
      : 0;

  const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;

  // ─── Booking handlers ─────────────────────────────────────────────────────
  const handleReserve = () => {
    setBookingError(null);
    if (!bookingData.checkInDate || !bookingData.checkOutDate) {
      setBookingError(t('pages.rooms.booking.errorSelectDates'));
      return;
    }
    if (bookingData.checkOutDate <= bookingData.checkInDate) {
      setBookingError(t('pages.rooms.booking.errorCheckoutAfterCheckin'));
      return;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (bookingData.checkInDate < today) {
      setBookingError(t('pages.rooms.booking.errorPastDate'));
      return;
    }
    if (isAvailable === false) {
      setBookingError(t('pages.rooms.booking.errorNotAvailable'));
      return;
    }
    setBookingPhase('info');
    setTimeout(() => {
      document.getElementById('booking-info-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleConfirmBooking = async () => {
    setBookingError(null);
    if (bookingData.adults < 1) { setBookingError(t('pages.rooms.booking.errorAdultRequired')); return; }
    if (!bookingData.contactInfo.phone || !bookingData.contactInfo.email) {
      setBookingError(t('pages.rooms.booking.errorContactRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.contactInfo.email)) {
      setBookingError(t('pages.rooms.booking.errorEmailInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await reservationsService.createReservation({
        type: 'room',
        checkInDate: bookingData.checkInDate!.toISOString(),
        checkOutDate: bookingData.checkOutDate!.toISOString(),
        guests: totalGuests,
        guestDetails: {
          adults: bookingData.adults,
          children: bookingData.children,
          infants: bookingData.infants,
        },
        guestName: {
          firstName: bookingData.contactInfo.firstName,
          lastName: bookingData.contactInfo.lastName,
        },
        contactInfo: {
          phone: bookingData.contactInfo.phone,
          email: bookingData.contactInfo.email,
          emergencyContact: bookingData.contactInfo.emergencyContact || undefined,
          country: bookingData.contactInfo.country || undefined,
        },
        services: { breakfast: false, airportTransfer: false, spa: false, aquaPark: false },
        specialRequests: bookingData.specialRequests,
      });
      const reservation = res.data.data as Reservation;
      const token = reservation?.confirmationToken;
      if (token) router.push(`/${lang}/reservation/${token}`);
      else router.push(`/${lang}/reservations`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setBookingError(e.response?.data?.message || t('pages.rooms.booking.errorBookingFailed'));
    } finally { setSubmitting(false); }
  };

  // ─── Guests popover ───────────────────────────────────────────────────────
  const guestsOpen = Boolean(guestsAnchorEl);

  const renderGuestCounterRow = (
    label: string,
    desc: string,
    value: number,
    onChange: (v: number) => void,
    min = 0,
  ) => (
    <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
      <Box>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size="small"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          sx={{ border: '1px solid', borderColor: 'divider', width: 32, height: 32 }}
        >
          <Remove fontSize="small" />
        </IconButton>
        <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>{value}</Typography>
        <IconButton
          size="small"
          onClick={() => onChange(value + 1)}
          sx={{ border: '1px solid', borderColor: 'divider', width: 32, height: 32 }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ mt: 2 }}>{t('pages.rooms.loadingPage')}</Typography>
      </Container>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      {/* ── Photo Grid ─────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2, md: 4 }, pb: 2, position: 'relative' }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateRows: '175px 175px',
            gap: 1,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Large left photo */}
          <Box sx={{ gridRow: '1 / 3', overflow: 'hidden' }}>
            <Box
              component="img"
              src={PHOTOS[0].src}
              alt={t(PHOTOS[0].altKey)}
              onClick={() => { setPhotoViewerIndex(0); setPhotoViewerOpen(true); }}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.02)' } }}
            />
          </Box>
          {/* Small photos 2x2 */}
          {PHOTOS.slice(1).map((photo, i) => (
            <Box key={i} sx={{ overflow: 'hidden' }}>
              <Box
                component="img"
                src={photo.src}
                alt={t(photo.altKey)}
                onClick={() => { setPhotoViewerIndex(i + 1); setPhotoViewerOpen(true); }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.03)' } }}
              />
            </Box>
          ))}
        </Box>

        {/* Mobile: single large image */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, height: 260, borderRadius: 3, overflow: 'hidden' }}>
          <Box
            component="img"
            src={PHOTOS[0].src}
            alt={t(PHOTOS[0].altKey)}
            onClick={() => { setPhotoViewerIndex(0); setPhotoViewerOpen(true); }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
          />
        </Box>

        {/* Show all photos button */}
        <Button
          size="small"
          variant="contained"
          startIcon={<GridView fontSize="small" />}
          sx={{
            position: 'absolute',
            bottom: { xs: 24, md: 24 },
            right: { xs: 16, md: 24 },
            bgcolor: 'white',
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.8rem',
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.2)',
            boxShadow: 2,
            '&:hover': { bgcolor: 'grey.100' },
            px: 2,
            py: 0.75,
          }}
          onClick={() => { setPhotoViewerIndex(0); setPhotoViewerOpen(true); }}
        >
          {t('pages.rooms.showAllPhotos')}
        </Button>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1120, px: { xs: 2, md: 3 } }}>
        {/* ── Title & Meta ──────────────────────────────────────────────── */}
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {t('pages.rooms.listingTitle')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Star sx={{ color: 'secondary.main', fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('pages.rooms.metaRating')}</Typography>
            <Typography variant="body2" color="text.secondary">·</Typography>
            <Typography variant="body2" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
              {t('pages.rooms.metaReviews')}
            </Typography>
            <Typography variant="body2" color="text.secondary">·</Typography>
            <Typography variant="body2" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
              {t('pages.rooms.metaLocation')}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* ── Two-column body ───────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 6 },
            py: 4,
            alignItems: 'flex-start',
          }}
        >
          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 58%' }, minWidth: 0, maxWidth: { md: '58%' } }}>

            {/* What's Included */}
            <Box sx={{ pb: 4 }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                {t('pages.rooms.amenitiesTitle')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(5, auto)', gridAutoFlow: 'column', gap: 2, mt: 2 }}>
                {AMENITIES_PREVIEW.map((a) => (
                  <Box key={a.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex' }}>{a.icon}</Box>
                    <Typography variant="body2">{t(`pages.rooms.amenities.${a.key}`)}</Typography>
                  </Box>
                ))}
              </Box>
              <Button
                variant="outlined"
                sx={{
                  mt: 3, borderRadius: 2, borderColor: 'text.primary', color: 'text.primary',
                  fontWeight: 600, textTransform: 'none', px: 3,
                  '&:hover': { bgcolor: 'grey.100', borderColor: 'text.primary' },
                }}
                onClick={() => setShowAllAmenities(true)}
              >
                {t('pages.rooms.showAllAmenities', { count: AMENITIES_ALL.length })}
              </Button>
            </Box>

            <Divider />

            {/* Description */}
            <Box sx={{ py: 4 }}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                {t('pages.rooms.descriptionTitle')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
                {t('pages.rooms.descriptionShort')}
              </Typography>
              <Button
                variant="text"
                sx={{
                  mt: 1, fontWeight: 600, textTransform: 'none', color: 'text.primary', p: 0,
                  textDecoration: 'underline', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
                onClick={() => setShowFullDescription(true)}
              >
                {t('pages.rooms.showMore')}
              </Button>
            </Box>

            <Divider />

            {/* Where you'll sleep */}
            {rooms.length > 0 && (
              <Box sx={{ py: 4 }}>
                <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                  {t('pages.rooms.whereYouSleep')}
                </Typography>
                <Box
                  sx={{
                    display: 'flex', gap: 2, overflowX: 'auto', pb: 1, mt: 2,
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'grey.100', borderRadius: 2 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 },
                  }}
                >
                  {rooms.map((room) => (
                    <Box
                      key={room._id}
                      sx={{ flex: '0 0 220px', border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
                    >
                      <Box sx={{ height: 140, overflow: 'hidden', bgcolor: 'grey.100' }}>
                        <Box
                          component="img"
                          src={room.images && room.images.length > 0 ? resolveMediaUrl(room.images[0]) : '/images/villa.png'}
                          alt={room.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/images/villa.png'; }}
                        />
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.bedConfiguration || t('pages.rooms.roomDefaultBed')}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* ── RIGHT COLUMN – Sticky Booking Card ─────────────────────── */}
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '0 0 38%' },
              maxWidth: { md: '38%' },
              width: '100%',
              position: { md: 'sticky' },
              top: { md: 88 },
              alignSelf: 'flex-start',
            }}
          >
            <Box
              id="booking-card"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, boxShadow: 4, p: 3, bgcolor: 'background.paper' }}
            >
              {bookingPhase === 'dates' ? (
                <>
                  {/* Price row */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
                    {adultRate > 0 ? (
                      <>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatMoney(adultRate)}</Typography>
                        <Typography variant="body2" color="text.secondary">/ {t('pages.rooms.booking.perNight')}</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('pages.rooms.booking.selectDatesPrompt')}
                      </Typography>
                    )}
                  </Box>

                  {/* Rating */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                    <Star sx={{ color: 'secondary.main', fontSize: 14 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{t('pages.rooms.metaRating')}</Typography>
                    <Typography variant="caption" color="text.secondary">·</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                      {t('pages.rooms.metaReviews')}
                    </Typography>
                  </Box>

                  {/* Date + Guests inputs box – relative container for calendar dropdown */}
                  <Box sx={{ position: 'relative', mb: 1 }}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                      {/* Dates row – click to toggle calendar */}
                      <Box
                        sx={{
                          display: 'flex',
                          borderBottom: '1px solid',
                          borderColor: showDatePicker ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.50' },
                          outline: showDatePicker ? '2px solid' : 'none',
                          outlineColor: 'primary.main',
                          borderRadius: showDatePicker ? '8px 8px 0 0' : 0,
                        }}
                        onClick={() => setShowDatePicker((v) => !v)}
                      >
                        <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mb: 0.25, fontWeight: 700, color: 'text.secondary',
                              textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}
                          >
                            {t('pages.rooms.booking.checkIn')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: bookingData.checkInDate ? 600 : 400, color: bookingData.checkInDate ? 'text.primary' : 'text.secondary' }}>
                            {bookingData.checkInDate
                              ? bookingData.checkInDate.toLocaleDateString()
                              : t('pages.rooms.booking.addDate')}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, p: 1.5 }}>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mb: 0.25, fontWeight: 700, color: 'text.secondary',
                              textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}
                          >
                            {t('pages.rooms.booking.checkOut')}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: bookingData.checkOutDate ? 600 : 400, color: bookingData.checkOutDate ? 'text.primary' : 'text.secondary' }}>
                            {bookingData.checkOutDate
                              ? bookingData.checkOutDate.toLocaleDateString()
                              : t('pages.rooms.booking.addDate')}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Guests row */}
                      <Box
                        sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                        onClick={(e) => setGuestsAnchorEl(e.currentTarget)}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                          {t('pages.rooms.booking.guests')}
                        </Typography>
                        <Typography variant="body2">
                          {totalGuests === 1
                            ? t('pages.rooms.booking.guestsCounter', { count: totalGuests })
                            : t('pages.rooms.booking.guestsCounterPlural', { count: totalGuests })}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Calendar dropdown – absolutely positioned so it can overflow the card */}
                    {showDatePicker && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1300,
                          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
                        }}
                      >
                        <DateRangePicker
                          startDate={toDateStr(bookingData.checkInDate)}
                          endDate={toDateStr(bookingData.checkOutDate)}
                          minDate={toDateStr(new Date())}
                          onChange={(start, end) => {
                            setBookingData((prev) => ({
                              ...prev,
                              checkInDate: fromDateStr(start),
                              checkOutDate: fromDateStr(end),
                            }));
                            setIsAvailable(null);
                            if (start && end) setTimeout(() => setShowDatePicker(false), 400);
                          }}
                        />
                      </Box>
                    )}
                  </Box>

                  {/* Guests popover */}
                  <Popover
                    open={guestsOpen}
                    anchorEl={guestsAnchorEl}
                    onClose={() => setGuestsAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    slotProps={{ paper: { sx: { p: 2, width: 300, borderRadius: 2, boxShadow: 4 } } }}
                  >
                    {renderGuestCounterRow(
                      t('pages.rooms.booking.adults'),
                      t('pages.rooms.booking.adultsDesc'),
                      bookingData.adults,
                      (v) => setBookingData((p) => ({ ...p, adults: v })),
                      1,
                    )}
                    <Divider />
                    {renderGuestCounterRow(
                      t('pages.rooms.booking.children'),
                      t('pages.rooms.booking.childrenDesc'),
                      bookingData.children,
                      (v) => setBookingData((p) => ({ ...p, children: v })),
                    )}
                    <Divider />
                    {renderGuestCounterRow(
                      t('pages.rooms.booking.infants'),
                      t('pages.rooms.booking.infantsDesc'),
                      bookingData.infants,
                      (v) => setBookingData((p) => ({ ...p, infants: v })),
                    )}
                  </Popover>

                  {isAvailable === false && !availabilityLoading && (
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem' }}>
                      {t('pages.rooms.booking.errorNotAvailable')}
                    </Alert>
                  )}
                  {isAvailable === true && !availabilityLoading && (
                    <Alert severity="success" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem' }}>
                      {t('pages.rooms.booking.availableForDates')}
                    </Alert>
                  )}

                  {/* Error */}
                  {bookingError && (
                    <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem' }}>{bookingError}</Alert>
                  )}

                  {/* Check Availability / Continue to Book button */}
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={
                      !bookingData.checkInDate || !bookingData.checkOutDate ||
                      availabilityLoading || isAvailable === false
                    }
                    onClick={() => checkAvailability()}
                    startIcon={availabilityLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ fontWeight: 700, borderRadius: 2, py: 1.75, fontSize: '1rem', textTransform: 'none' }}
                  >
                    {availabilityLoading
                      ? t('pages.rooms.booking.checkingAvailability')
                      : t('pages.rooms.booking.checkAvailability')}
                  </Button>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                    {t('pages.rooms.booking.notChargedYet')}
                  </Typography>

                  {/* Price breakdown */}
                  {nights > 0 && totalPrice > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {formatMoney(adultRate)} × {nights} {nights === 1 ? t('pages.rooms.booking.night') : t('pages.rooms.booking.nights')}
                        </Typography>
                        <Typography variant="body2">{formatMoney(totalPrice)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('pages.rooms.booking.totalBeforeTaxes')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totalPrice)}</Typography>
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                /* ─── Guest Info Phase ─────────────────────────────────── */
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => { setBookingPhase('dates'); setBookingError(null); }}>
                      <ArrowBack fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('pages.rooms.booking.guestInfoTitle')}</Typography>
                  </Box>

                  {/* Dates summary banner */}
                  {nights > 0 && (
                    <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 1.5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {bookingData.checkInDate?.toLocaleDateString()} → {bookingData.checkOutDate?.toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {nights} {nights === 1 ? t('pages.rooms.booking.night') : t('pages.rooms.booking.nights')}
                        {' · '}
                        {totalGuests === 1
                          ? t('pages.rooms.booking.guestsCounter', { count: totalGuests })
                          : t('pages.rooms.booking.guestsCounterPlural', { count: totalGuests })}
                      </Typography>
                    </Box>
                  )}

                  {/* Guest info form */}
                  <Box id="booking-info-form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth required size="small"
                        label={t('pages.rooms.booking.firstName')}
                        value={bookingData.contactInfo.firstName}
                        onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, firstName: e.target.value } }))}
                      />
                      <TextField
                        fullWidth required size="small"
                        label={t('pages.rooms.booking.lastName')}
                        value={bookingData.contactInfo.lastName}
                        onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, lastName: e.target.value } }))}
                      />
                    </Box>
                    <TextField
                      fullWidth required size="small" type="email"
                      label={t('pages.rooms.booking.email')}
                      value={bookingData.contactInfo.email}
                      onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, email: e.target.value } }))}
                    />
                    <TextField
                      fullWidth required size="small"
                      label={t('pages.rooms.booking.phone')}
                      value={bookingData.contactInfo.phone}
                      onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, phone: e.target.value } }))}
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('pages.rooms.booking.country')}</InputLabel>
                      <Select
                        value={bookingData.contactInfo.country}
                        label={t('pages.rooms.booking.country')}
                        onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, country: e.target.value } }))}
                      >
                        {getCountriesForDisplay().map((c) => (
                          <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth size="small"
                      label={t('pages.rooms.booking.emergencyContact')}
                      value={bookingData.contactInfo.emergencyContact}
                      onChange={(e) => setBookingData((p) => ({ ...p, contactInfo: { ...p.contactInfo, emergencyContact: e.target.value } }))}
                    />
                    <TextField
                      fullWidth size="small" multiline rows={3}
                      label={t('pages.rooms.booking.specialRequests')}
                      placeholder={t('pages.rooms.booking.specialRequestsPlaceholder')}
                      value={bookingData.specialRequests}
                      onChange={(e) => setBookingData((p) => ({ ...p, specialRequests: e.target.value }))}
                    />

                    {totalPrice > 0 && (
                      <>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('pages.rooms.booking.totalBeforeTaxes')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totalPrice)}</Typography>
                        </Box>
                      </>
                    )}

                    {bookingError && (
                      <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem' }}>{bookingError}</Alert>
                    )}

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      disabled={submitting}
                      onClick={handleConfirmBooking}
                      startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                      sx={{ fontWeight: 700, borderRadius: 2, py: 1.75, fontSize: '1rem', textTransform: 'none' }}
                    >
                      {submitting ? t('pages.rooms.booking.processing') : t('pages.rooms.booking.completeBooking')}
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                      {t('pages.rooms.booking.notChargedYet')}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* ── Map Section ───────────────────────────────────────────────── */}
        <Box sx={{ py: 5 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {t('pages.rooms.whereYouBe')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('pages.rooms.locationCity')}
          </Typography>
          <Box
            sx={{
              mt: 2, height: 400, borderRadius: 3, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid', borderColor: 'divider',
              backgroundImage: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: '2.5rem', mb: 1, lineHeight: 1 }}>📍</Box>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>Banana Ranch Villages</Typography>
              <Typography variant="body2" color="text.secondary">{t('pages.rooms.locationCity')}</Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* ── Things to Know ─────────────────────────────────────────────── */}
        <Box sx={{ py: 5, pb: 8 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {t('pages.rooms.thingsToKnow')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
            {/* Cancellation policy */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>{t('pages.rooms.cancellationTitle')}</Typography>
              {[t('pages.rooms.cancellationLine1'), t('pages.rooms.cancellationLine2'), t('pages.rooms.cancellationLine3')].map((line, i) => (
                <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{line}</Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                {t('pages.rooms.learnMore')}
              </Typography>
            </Box>
            {/* House rules */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>{t('pages.rooms.houseRulesTitle')}</Typography>
              {[t('pages.rooms.houseRulesLine1'), t('pages.rooms.houseRulesLine2'), t('pages.rooms.houseRulesLine3')].map((line, i) => (
                <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{line}</Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                {t('pages.rooms.learnMore')}
              </Typography>
            </Box>
            {/* Safety */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>{t('pages.rooms.safetyTitle')}</Typography>
              {[t('pages.rooms.safetyLine1'), t('pages.rooms.safetyLine2'), t('pages.rooms.safetyLine3')].map((line, i) => (
                <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{line}</Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                {t('pages.rooms.learnMore')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* ── All Amenities Modal ──────────────────────────────────────────── */}
      <Dialog open={showAllAmenities} onClose={() => setShowAllAmenities(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1rem' }}>{t('pages.rooms.allAmenitiesTitle')}</Typography>
          <IconButton onClick={() => setShowAllAmenities(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {AMENITIES_ALL.map((a) => (
              <Box key={a.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>{a.icon}</Box>
                <Typography variant="body1">{t(`pages.rooms.amenities.${a.key}`)}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllAmenities(false)} sx={{ fontWeight: 600 }}>
            {t('pages.rooms.booking.back')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Full Description Modal ───────────────────────────────────────── */}
      <Dialog open={showFullDescription} onClose={() => setShowFullDescription(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1rem' }}>{t('pages.rooms.descriptionTitle')}</Typography>
          <IconButton onClick={() => setShowFullDescription(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {t('pages.rooms.descriptionFull')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFullDescription(false)}>{t('pages.rooms.booking.back')}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Photo Viewer ──────────────────────────────────────────────────── */}
      <Dialog
        open={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        fullScreen
        slotProps={{ paper: { sx: { bgcolor: 'rgba(0,0,0,0.95)', borderRadius: 0 } } }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={() => setPhotoViewerOpen(false)}
            sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, zIndex: 10 }}
          >
            <Close />
          </IconButton>

          {/* Counter */}
          <Typography
            variant="body2"
            sx={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'white', fontWeight: 600, zIndex: 10 }}
          >
            {photoViewerIndex + 1} / {PHOTOS.length}
          </Typography>

          {/* Prev arrow */}
          <IconButton
            onClick={() => setPhotoViewerIndex((i) => Math.max(0, i - 1))}
            disabled={photoViewerIndex === 0}
            sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: photoViewerIndex > 0 ? 'rgba(255,255,255,0.15)' : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, zIndex: 10 }}
          >
            <ChevronLeft sx={{ fontSize: 40 }} />
          </IconButton>

          {/* Photo */}
          <Box
            component="img"
            src={PHOTOS[photoViewerIndex]?.src}
            alt={t(PHOTOS[photoViewerIndex]?.altKey)}
            sx={{
              maxWidth: '88vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              borderRadius: 2,
            }}
          />

          {/* Next arrow */}
          <IconButton
            onClick={() => setPhotoViewerIndex((i) => Math.min(PHOTOS.length - 1, i + 1))}
            disabled={photoViewerIndex === PHOTOS.length - 1}
            sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: photoViewerIndex < PHOTOS.length - 1 ? 'rgba(255,255,255,0.15)' : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }, zIndex: 10 }}
          >
            <ChevronRight sx={{ fontSize: 40 }} />
          </IconButton>

          {/* Thumbnail strip */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
              zIndex: 10,
            }}
          >
            {PHOTOS.map((photo, i) => (
              <Box
                key={i}
                component="img"
                src={photo.src}
                alt={t(photo.altKey)}
                onClick={() => setPhotoViewerIndex(i)}
                sx={{
                  width: 64,
                  height: 48,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: i === photoViewerIndex ? '2px solid white' : '2px solid rgba(255,255,255,0.3)',
                  opacity: i === photoViewerIndex ? 1 : 0.55,
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 1 },
                }}
              />
            ))}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

