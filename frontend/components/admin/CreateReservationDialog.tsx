'use client';

/**
 * CreateReservationDialog
 *
 * 4-step reservation creation wizard for admin use.
 * Step 0: service type selection (room / day pass / pasa tarde / event)
 * Step 1: dates, guest counts (+ availability check & room assignment for rooms)
 * Step 2: guest info & contact
 * Step 3: summary + confirm
 *
 * Pricing model: uses banana-web-app's existing pricingService and
 * findApplicablePricing utility (pricingService.getPricing + local calculation).
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Celebration,
  CheckCircle,
  EventNote,
  Hotel,
  KingBed,
  Search,
  WbSunny,
} from '@mui/icons-material';
import { Reservation } from '@/types';
import { reservationsService, roomsService, pricingService } from '@/lib/api';
import { findApplicablePricing, PricingRule } from '@/utils/pricing';
import { formatMoney } from '@/utils/currency';
import { useTranslation } from 'react-i18next';
import NumberField from '@/components/common/NumberField';
import DateRangePicker from '@/components/common/DateRangePicker';
import SingleDatePicker from '@/components/common/SingleDatePicker';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addOneDay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const normalizeRange = (checkIn: string, checkOut?: string) => ({
  ci: checkIn,
  co: (!checkOut || checkOut <= checkIn) ? addOneDay(checkIn) : checkOut,
});

const countNights = (checkIn: string, checkOut: string): number => {
  const ci = new Date(checkIn + 'T00:00:00');
  const co = new Date(checkOut + 'T00:00:00');
  return Math.max(1, Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ReservationType = 'room' | 'daypass' | 'PasaTarde' | 'event';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (reservation: Reservation) => void;
  onSnackbar: (message: string, severity: 'success' | 'error') => void;
  /** When provided, skip Step 0 and pre-fill type + dates */
  defaultType?: ReservationType;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  /** Pre-select this room (by ID) once available rooms are fetched */
  defaultRoomId?: string;
}

const DEFAULT_FORM = {
  type:            'room' as ReservationType,
  firstName:       '',
  lastName:        '',
  email:           '',
  phone:           '',
  checkInDate:     '',
  checkOutDate:    '',
  adults:          1,
  children:        0,
  infants:         0,
  specialRequests: '',
  totalPrice:      0,
};

// ─── Component ────────────────────────────────────────────────────────────────
const CreateReservationDialog: React.FC<Props> = ({
  open, onClose, onCreated, onSnackbar,
  defaultType, defaultCheckIn, defaultCheckOut, defaultRoomId,
}) => {
  const { t } = useTranslation();

  const [createStep, setCreateStep]     = useState<0 | 1 | 2 | 3>(0);
  const [createForm, setCreateForm]     = useState(DEFAULT_FORM);
  const [createLoading, setCreateLoading] = useState(false);

  // Room availability + selection
  const [createAvailableRooms, setCreateAvailableRooms]       = useState<any[]>([]);
  const [createCheckingAvailability, setCreateCheckingAvailability] = useState(false);
  const [createAvailabilityChecked, setCreateAvailabilityChecked]   = useState(false);
  const [selectedRooms, setSelectedRooms]                           = useState<any[]>([]);
  const [roomSearch, setRoomSearch]                                 = useState('');
  const [defaultRoomApplied, setDefaultRoomApplied] = useState(false);

  // Pricing
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  // Validation
  const [createStep2Error, setCreateStep2Error] = useState<string | null>(null);

  // When opened with pre-fill props, skip Step 0 and populate dates
  useEffect(() => {
    if (!open) return;
    if (defaultType) {
      setCreateForm(f => ({
        ...f,
        type: defaultType,
        checkInDate: defaultCheckIn || f.checkInDate,
        checkOutDate: defaultCheckOut || f.checkOutDate,
      }));
      setCreateStep(1);
      setDefaultRoomApplied(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType, defaultCheckIn, defaultCheckOut]);

  // Auto-select the default room once available rooms are fetched
  useEffect(() => {
    if (!defaultRoomId || defaultRoomApplied || !createAvailabilityChecked) return;
    const match = createAvailableRooms.find((r: any) => r._id === defaultRoomId);
    if (match) {
      setSelectedRooms([match]);
      setDefaultRoomApplied(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRoomId, createAvailableRooms, createAvailabilityChecked, defaultRoomApplied]);

  // Auto-fetch available rooms when both dates are set (room type only)
  useEffect(() => {
    if (!open || createForm.type !== 'room' || !createForm.checkInDate || !createForm.checkOutDate) return;
    const { ci, co } = normalizeRange(createForm.checkInDate, createForm.checkOutDate);
    setCreateCheckingAvailability(true);
    setCreateAvailabilityChecked(false);
    setSelectedRooms([]);
    roomsService.getAvailableRooms(ci, co)
      .then(res => {
        setCreateAvailableRooms(Array.isArray(res.data.data) ? res.data.data : []);
        setCreateAvailabilityChecked(true);
      })
      .catch(() => { setCreateAvailableRooms([]); setCreateAvailabilityChecked(true); })
      .finally(() => setCreateCheckingAvailability(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, createForm.type, createForm.checkInDate, createForm.checkOutDate]);

  // Load pricing rules when type or step changes
  useEffect(() => {
    if (!open) return;
    const serviceMap: Record<string, 'daypass' | 'pasatarde' | 'hospedaje'> = {
      room: 'hospedaje',
      daypass: 'daypass',
      PasaTarde: 'pasatarde',
      event: 'hospedaje',
    };
    const svc = serviceMap[createForm.type];
    if (!svc) return;
    pricingService.getPricing({ service: svc })
      .then(res => setPricingRules(Array.isArray(res.data.data) ? res.data.data as any[] : []))
      .catch(() => setPricingRules([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, createForm.type]);

  // ── Recalculate total price whenever relevant fields change ──────────────
  useEffect(() => {
    if (!createForm.checkInDate) return;
    const date = new Date(createForm.checkInDate + 'T00:00:00');
    const rule = findApplicablePricing(pricingRules, date);
    if (!rule) return;

    if (createForm.type === 'room') {
      if (!createForm.checkOutDate) return;
      const nights = countNights(createForm.checkInDate, createForm.checkOutDate);
      const total = nights * (rule.adultPrice * createForm.adults + rule.childrenPrice * createForm.children);
      setCreateForm(f => ({ ...f, totalPrice: Math.round(total) }));
    } else if (createForm.type !== 'event') {
      const total = rule.adultPrice * createForm.adults + rule.childrenPrice * createForm.children;
      setCreateForm(f => ({ ...f, totalPrice: Math.round(total) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingRules, createForm.type, createForm.checkInDate, createForm.checkOutDate, createForm.adults, createForm.children]);

  const resetDialog = () => {
    setCreateForm(DEFAULT_FORM);
    setCreateStep(0);
    setCreateAvailableRooms([]);
    setCreateAvailabilityChecked(false);
    setSelectedRooms([]);
    setRoomSearch('');
    setCreateStep2Error(null);
    setPricingRules([]);
    setDefaultRoomApplied(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  // Capacity helpers
  const totalBillableGuests = createForm.adults + createForm.children;
  const selectedCapacity = selectedRooms.reduce((sum, r) => {
    const cap = (r.roomTypeId as any)?.capacity ?? (r.capacity as number) ?? 1;
    return sum + cap;
  }, 0);
  const capacitySatisfied = createForm.type !== 'room' || selectedRooms.length === 0 || selectedCapacity >= totalBillableGuests;

  const toggleRoomSelection = (room: any) => {
    setSelectedRooms(prev => {
      const already = prev.some(r => r._id === room._id);
      return already ? prev.filter(r => r._id !== room._id) : [...prev, room];
    });
  };

  const handleContinueStep1 = () => {
    if (createForm.type === 'room' && (!createForm.checkInDate || !createForm.checkOutDate)) return;
    if (createForm.type !== 'room' && !createForm.checkInDate) return;
    setCreateStep(2);
  };

  const handleContinueStep2 = () => {
    setCreateStep2Error(null);
    setCreateStep(3);
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      const guests = createForm.adults + createForm.children + createForm.infants;
      const payload: any = {
        type:            createForm.type,
        checkInDate:     createForm.checkInDate,
        guests,
        guestDetails:    { adults: createForm.adults, children: createForm.children, infants: createForm.infants },
        guestName:       { firstName: createForm.firstName, lastName: createForm.lastName },
        contactInfo:     { email: createForm.email, phone: createForm.phone },
        specialRequests: createForm.specialRequests,
        totalPrice:      createForm.totalPrice,
      };
      if (createForm.checkOutDate) payload.checkOutDate = createForm.checkOutDate;
      if (createForm.type === 'room' && selectedRooms.length > 0) {
        payload.rooms = selectedRooms.map(r => r._id);
      }
      const res = await reservationsService.createReservation(payload);
      onCreated(res.data.data as Reservation);
      onSnackbar(t('admin.reservations.messages.createSuccess', 'Reservation created successfully!'), 'success');
      handleClose();
    } catch (error: any) {
      const detail = error.response?.data?.errors?.join(', ')
        || error.response?.data?.message
        || 'Failed to create reservation';
      onSnackbar(detail, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const typeLabel = (type: ReservationType) => {
    const map: Record<ReservationType, string> = {
      room:      t('admin.reservations.typeLabels.room', 'Room'),
      daypass:   t('admin.reservations.typeLabels.daypass', 'Day Pass'),
      PasaTarde: t('admin.reservations.typeLabels.pasatarde', 'Pasa Tarde'),
      event:     t('admin.reservations.typeLabels.event', 'Event'),
    };
    return map[type] || type;
  };

  // Computed price preview label
  const pricePreviewLabel = (() => {
    if (!createForm.checkInDate) return null;
    const date = new Date(createForm.checkInDate + 'T00:00:00');
    const rule = findApplicablePricing(pricingRules, date);
    if (!rule) return null;
    if (createForm.type === 'room') {
      if (!createForm.checkOutDate) return null;
      const nights = countNights(createForm.checkInDate, createForm.checkOutDate);
      return { nights, adultRate: rule.adultPrice, childrenRate: rule.childrenPrice };
    }
    return { adultRate: rule.adultPrice, childrenRate: rule.childrenPrice };
  })();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {createStep === 0
          ? t('admin.reservations.actions.newReservation', 'New Reservation')
          : createStep === 1
          ? t('admin.reservations.create.step1Title', 'Dates & Guests')
          : createStep === 2
          ? t('admin.reservations.create.step2Title', 'Guest Details')
          : t('admin.reservations.create.step3Title', 'Summary')}
      </DialogTitle>

      {createStep > 0 && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Stepper activeStep={createStep - 1} alternativeLabel>
            <Step><StepLabel>{t('admin.reservations.create.stepDates', 'Dates & Guests')}</StepLabel></Step>
            <Step><StepLabel>{t('admin.reservations.create.stepGuest', 'Guest Info')}</StepLabel></Step>
            <Step><StepLabel>{t('admin.reservations.create.stepSummary', 'Summary')}</StepLabel></Step>
          </Stepper>
        </Box>
      )}

      <DialogContent sx={{ pt: 1 }}>

        {/* ── Step 0: Service type cards ── */}
        {createStep === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('admin.reservations.create.pickServicePrompt', 'Select the type of reservation you want to create.')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'primary.main', boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
                <CardActionArea onClick={() => { setCreateForm(f => ({ ...f, type: 'room' })); setCreateAvailableRooms([]); setCreateAvailabilityChecked(false); setCreateStep(1); }} sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Hotel sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('admin.reservations.typeLabels.room', 'Room')}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{t('admin.reservations.create.roomDesc', 'Multi-night room stay')}</Typography>
                  </Box>
                </CardActionArea>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'warning.main', boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
                <CardActionArea onClick={() => { setCreateForm(f => ({ ...f, type: 'daypass', checkOutDate: '' })); setCreateStep(1); }} sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <WbSunny sx={{ fontSize: 40, color: 'warning.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('admin.reservations.typeLabels.daypass', 'Day Pass')}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{t('admin.reservations.create.daypassDesc', 'Full-day pool & facilities')}</Typography>
                  </Box>
                </CardActionArea>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'secondary.main', boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
                <CardActionArea onClick={() => { setCreateForm(f => ({ ...f, type: 'PasaTarde', checkOutDate: '' })); setCreateStep(1); }} sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Celebration sx={{ fontSize: 40, color: 'secondary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('admin.reservations.typeLabels.pasatarde', 'Pasa Tarde')}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{t('admin.reservations.create.pasatardeDesc', 'Afternoon experience')}</Typography>
                  </Box>
                </CardActionArea>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'info.main', boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
                <CardActionArea onClick={() => { setCreateForm(f => ({ ...f, type: 'event', checkOutDate: '' })); setCreateStep(1); }} sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <EventNote sx={{ fontSize: 40, color: 'info.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('admin.reservations.typeLabels.event', 'Event')}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{t('admin.reservations.create.eventDesc', 'Private event or celebration')}</Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Box>
          </Box>
        )}

        {/* ── Step 1: Dates & guests ── */}
        {createStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {createForm.type === 'room' && createAvailabilityChecked && (
              <Alert severity={createAvailableRooms.length > 0 ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
                {createAvailableRooms.length > 0
                  ? t('admin.reservations.create.roomsAvailable', '{{count}} room(s) available for your selection.', { count: createAvailableRooms.length })
                  : t('admin.reservations.create.noRoomsAvailable', 'No rooms available for the selected dates.')}
              </Alert>
            )}

            {/* Date selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {createForm.type === 'room'
                  ? t('admin.reservations.create.selectDateRange', 'Select dates')
                  : t('admin.reservations.form.checkIn', 'Select date')}
              </Typography>
              {createForm.type === 'room' ? (
                <DateRangePicker
                  startDate={createForm.checkInDate}
                  endDate={createForm.checkOutDate}
                  onChange={(start, end) => {
                    setCreateForm(f => ({ ...f, checkInDate: start, checkOutDate: end }));
                    setCreateAvailabilityChecked(false);
                  }}
                />
              ) : (
                <SingleDatePicker
                  value={createForm.checkInDate}
                  onChange={date => setCreateForm(f => ({ ...f, checkInDate: date }))}
                />
              )}
            </Box>

            <Divider />

            {/* Guest counts */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.create.guestCount', 'Guests')}</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <NumberField label={t('admin.reservations.form.adults', 'Adults')}    value={createForm.adults}   min={1} onChange={v => setCreateForm(f => ({ ...f, adults:   v ?? 1 }))} />
                <NumberField label={t('admin.reservations.form.children', 'Children')} value={createForm.children} min={0} onChange={v => setCreateForm(f => ({ ...f, children: v ?? 0 }))} />
                <NumberField label={t('admin.reservations.form.infants', 'Infants')}   value={createForm.infants}  min={0} onChange={v => setCreateForm(f => ({ ...f, infants:  v ?? 0 }))} />
              </Box>
            </Box>

            {/* Room assignment (room type only) */}
            {createForm.type === 'room' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="subtitle2">
                    {t('admin.reservations.create.assignRooms', 'Assign Rooms')}
                  </Typography>
                  {selectedRooms.length > 0 && (
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                      {selectedRooms.length} {t('admin.reservations.create.selected', 'selected')}
                    </Typography>
                  )}
                </Box>

                {createCheckingAvailability && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">
                      {t('admin.reservations.create.checkingAvailability', 'Checking availability...')}
                    </Typography>
                  </Box>
                )}

                {!createCheckingAvailability && createAvailabilityChecked && createAvailableRooms.length === 0 && (
                  <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                    {t('admin.reservations.create.noRoomsAvailable', 'No rooms available for the selected dates.')}
                  </Alert>
                )}

                {!createCheckingAvailability && createAvailabilityChecked && createAvailableRooms.length > 0 && (() => {
                  const query = roomSearch.trim().toLowerCase();
                  const filteredRooms = query
                    ? createAvailableRooms.filter((r: any) =>
                        r.name?.toLowerCase().includes(query) ||
                        r.type?.toLowerCase().includes(query) ||
                        r.bedConfiguration?.toLowerCase().includes(query)
                      )
                    : createAvailableRooms;

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <TextField
                        size="small" fullWidth
                        placeholder={t('admin.reservations.create.filterRooms', 'Filter rooms...')}
                        value={roomSearch}
                        onChange={e => setRoomSearch(e.target.value)}
                        slotProps={{ input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        } }}
                      />

                      <Box sx={{ maxHeight: { xs: 300, sm: 360 }, overflowY: 'auto', pr: 0.5 }}>
                        {filteredRooms.length === 0 && (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {t('admin.reservations.create.noMatchingRooms', 'No matching rooms')}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                          {filteredRooms.map((room: any) => {
                            const isSelected = selectedRooms.some(r => r._id === room._id);
                            return (
                              <Paper
                                key={room._id}
                                variant="outlined"
                                onClick={() => toggleRoomSelection(room)}
                                sx={{
                                  p: 1.25,
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  borderWidth: 2,
                                  borderColor: isSelected ? 'primary.main' : 'divider',
                                  bgcolor: isSelected ? 'primary.50' : 'background.paper',
                                  transition: 'all 0.15s',
                                  '&:hover': { borderColor: isSelected ? 'primary.dark' : 'primary.light', boxShadow: 1 },
                                  '&:active': { transform: 'scale(0.97)' },
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.25,
                                  position: 'relative',
                                  overflow: 'hidden',
                                }}
                              >
                                {isSelected && (
                                  <CheckCircle sx={{ position: 'absolute', top: 6, right: 6, fontSize: 18, color: 'primary.main' }} />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500 }} noWrap>
                                  {room.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <KingBed sx={{ fontSize: 14, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                    {room.type}
                                  </Typography>
                                </Box>
                                {room.bedConfiguration && (
                                  <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.65rem' }}>
                                    {room.bedConfiguration}
                                  </Typography>
                                )}
                              </Paper>
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Capacity gauge when rooms selected */}
                      {selectedRooms.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {selectedRooms.length} {t('admin.reservations.create.roomsSelected', 'room(s) selected')}
                              </Typography>
                              {capacitySatisfied && <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />}
                            </Box>
                            {!capacitySatisfied && (
                              <Alert severity="warning" sx={{ mt: 0.75, borderRadius: 1.5, py: 0.25 }}>
                                {t('admin.reservations.create.capacityWarning', 'Selected rooms may not fit all guests')}
                              </Alert>
                            )}
                          </Box>
                          {/* Price preview */}
                          {pricePreviewLabel && createForm.checkInDate && createForm.checkOutDate && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('admin.reservations.form.totalPrice', 'Est. Total')}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary.main">{formatMoney(createForm.totalPrice)}</Typography>
                            </Box>
                          )}
                        </Paper>
                      )}
                    </Box>
                  );
                })()}
              </Box>
            )}

            {/* Price preview for non-room types */}
            {createForm.type !== 'room' && createForm.checkInDate && pricePreviewLabel && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} gutterBottom>
                  {t('admin.reservations.create.pricePreview', 'Price Preview')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">{createForm.adults} {t('admin.reservations.form.adults', 'adults')} × {formatMoney((pricePreviewLabel as any).adultRate)}</Typography>
                    <Typography variant="body2">{formatMoney(createForm.adults * (pricePreviewLabel as any).adultRate)}</Typography>
                  </Box>
                  {createForm.children > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">{createForm.children} {t('admin.reservations.form.children', 'children')} × {formatMoney((pricePreviewLabel as any).childrenRate)}</Typography>
                      <Typography variant="body2">{formatMoney(createForm.children * (pricePreviewLabel as any).childrenRate)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5, mt: 0.25, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('admin.reservations.form.totalPrice', 'Total')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary.main">{formatMoney(createForm.totalPrice)}</Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── Step 2: Guest info ── */}
        {createStep === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {createStep2Error && (
              <Alert severity="error" onClose={() => setCreateStep2Error(null)}>{createStep2Error}</Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={typeLabel(createForm.type)} color="primary" variant="outlined" />
              {createForm.checkInDate  && <Chip size="small" label={createForm.checkInDate} variant="outlined" />}
              {createForm.checkOutDate && <Chip size="small" label={`→ ${createForm.checkOutDate}`} variant="outlined" />}
              <Chip size="small" label={`${createForm.adults}A ${createForm.children}C ${createForm.infants}I`} variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label={t('admin.reservations.form.firstName', 'First Name')} value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} required />
              <TextField fullWidth size="small" label={t('admin.reservations.form.lastName', 'Last Name')}   value={createForm.lastName}  onChange={e => setCreateForm(f => ({ ...f, lastName:  e.target.value }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" type="email" label={t('admin.reservations.form.email', 'Email')} value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
              <TextField fullWidth size="small" label={t('admin.reservations.form.phone', 'Phone')} value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            </Box>
            <TextField
              fullWidth size="small" type="number"
              label={t('admin.reservations.form.estimatedPrice', 'Total Price')}
              value={createForm.totalPrice}
              onChange={e => setCreateForm(f => ({ ...f, totalPrice: Number(e.target.value) || 0 }))}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
            <TextField
              fullWidth size="small" multiline rows={3}
              label={t('admin.reservations.form.specialRequests', 'Special Requests')}
              value={createForm.specialRequests}
              onChange={e => setCreateForm(f => ({ ...f, specialRequests: e.target.value }))}
            />
          </Box>
        )}

        {/* ── Step 3: Summary ── */}
        {createStep === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
                {t('admin.reservations.create.summaryTitle', 'Reservation Summary')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('admin.reservations.table.type', 'Type')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{typeLabel(createForm.type)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('admin.reservations.table.dates', 'Dates')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{createForm.checkInDate}{createForm.checkOutDate ? ` → ${createForm.checkOutDate}` : ''}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('admin.reservations.table.guests', 'Guests')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{createForm.adults} {t('admin.reservations.form.adults')}, {createForm.children} {t('admin.reservations.form.children')}, {createForm.infants} {t('admin.reservations.form.infants')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('admin.reservations.form.guest', 'Guest')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{createForm.firstName} {createForm.lastName}</Typography>
                  {createForm.email && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{createForm.email}</Typography>}
                  {createForm.phone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{createForm.phone}</Typography>}
                </Box>
                {selectedRooms.length > 0 && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary">{t('admin.reservations.table.assignedRoom', 'Rooms')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRooms.map(r => r.name).join(', ')}</Typography>
                  </Box>
                )}
                {createForm.specialRequests && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary">{t('admin.reservations.form.specialRequests', 'Special Requests')}</Typography>
                    <Typography variant="body2">{createForm.specialRequests}</Typography>
                  </Box>
                )}
                <Box sx={{ gridColumn: '1 / -1', pt: 1.5, mt: 0.5, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} color="primary.main">
                    {t('admin.reservations.form.totalPrice', 'Total')}: {formatMoney(createForm.totalPrice)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={createLoading}>{t('admin.reservations.actions.cancel')}</Button>

        {createStep > 0 && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => setCreateStep(s => Math.max(0, s - 1) as 0 | 1 | 2 | 3)}
            disabled={createLoading}
          >
            {t('common.back', 'Back')}
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        {createStep === 1 && (
          <Button
            variant="contained"
            endIcon={createCheckingAvailability ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
            onClick={handleContinueStep1}
            disabled={
              !createForm.checkInDate ||
              (createForm.type === 'room' && !createForm.checkOutDate) ||
              createCheckingAvailability
            }
          >
            {t('common.continue', 'Continue')}
          </Button>
        )}

        {createStep === 2 && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleContinueStep2}
            disabled={!createForm.firstName.trim() || !createForm.email.trim()}
          >
            {t('common.continue', 'Continue')}
          </Button>
        )}

        {createStep === 3 && (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createLoading || !createForm.firstName.trim() || !createForm.email.trim() || !createForm.checkInDate}
          >
            {createLoading ? t('common.saving', 'Saving...') : t('admin.reservations.create.bookReservation', 'Book Reservation')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateReservationDialog;
