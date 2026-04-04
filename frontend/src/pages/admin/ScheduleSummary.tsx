import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  LinearProgress,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import AdminLayout from '../../components/admin/AdminLayout';
import SectionTitle from '../../components/admin/SectionTitle';
import { reservationsService } from '../../services/api';
import { Reservation } from '../../types';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

/** A reservation is "arrived" when guests are physically present:
 *  - Room reservations: guest has checked in (actualCheckInAt is set)
 *  - DayPass / Event reservations: fully paid (totalPayments >= totalPrice) */
const isArrived = (r: Reservation): boolean => {
  if (r.type === 'room') return !!r.actualCheckInAt;
  const total = r.totalPrice ?? 0;
  const paid = (r as any).totalPayments ?? 0;
  return total > 0 ? paid >= total : false;
};

const getTotalGuests = (r: Reservation) =>
  (r.guestDetails?.adults || 0) + (r.guestDetails?.children || 0) + (r.guestDetails?.infants || 0);

/** Sort: arrived first, then pending */
const sortArrivedFirst = (a: Reservation, b: Reservation) => {
  const aArr = isArrived(a) ? 0 : 1;
  const bArr = isArrived(b) ? 0 : 1;
  return aArr - bArr;
};

const ScheduleSummary: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'today' | 'tomorrow'>('today');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const selectedDate = useMemo(() => period === 'tomorrow' ? dayjs().add(1, 'day') : dayjs(), [period]);
  const dayStr = useMemo(() => selectedDate.format('YYYY-MM-DD'), [selectedDate]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await reservationsService.getReservations({ dateFrom: dayStr, dateTo: dayStr, limit: 200 });
        setReservations(res.data.data || []);
      } catch (e) {
        console.error('Failed to load schedule summary', e);
        setReservations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [dayStr]);

  const activeReservations = useMemo(() => reservations.filter(r => r.status !== 'cancelled'), [reservations]);
  const displayedReservations = useMemo(
    () => activeReservations.filter(r => r.type === 'room' || r.type === 'daypass' || r.type === 'event'),
    [activeReservations]
  );

  // ---------- Totals ----------
  const totals = useMemo(() => {
    let adults = 0, children = 0, infants = 0;
    let arrivedGuests = 0, pendingGuests = 0;
    displayedReservations.forEach(r => {
      const g = getTotalGuests(r);
      adults += r.guestDetails?.adults || 0;
      children += r.guestDetails?.children || 0;
      infants += r.guestDetails?.infants || 0;
      if (isArrived(r)) arrivedGuests += g; else pendingGuests += g;
    });
    return { adults, children, infants, totalPeople: adults + children + infants, arrivedGuests, pendingGuests };
  }, [displayedReservations]);

  // ---------- Helpers ----------
  const getGuestName = (r: Reservation) => r.guestName?.firstName
    ? `${r.guestName.firstName} ${r.guestName.lastName || ''}`.trim()
    : (typeof r.user === 'object' ? `${(r.user as any).firstName} ${(r.user as any).lastName}` : t('admin.dashboard.recentReservations.guestFallback'));

  // ---------- Categorize & sort ----------
  const categorized = useMemo(() => {
    const rooms = displayedReservations.filter(r => r.type === 'room').sort(sortArrivedFirst);
    const daypass = displayedReservations.filter(r => r.type === 'daypass').sort(sortArrivedFirst);
    const events = displayedReservations.filter(r => r.type === 'event').sort(sortArrivedFirst);
    return { rooms, daypass, events };
  }, [displayedReservations]);

  const categoryStats = useMemo(() => {
    const stats = (list: Reservation[]) => {
      let arrived = 0, pending = 0;
      list.forEach(r => { const g = getTotalGuests(r); if (isArrived(r)) arrived += g; else pending += g; });
      return { total: arrived + pending, arrived, pending };
    };
    return { rooms: stats(categorized.rooms), daypass: stats(categorized.daypass), events: stats(categorized.events) };
  }, [categorized]);

  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ---------- Reusable sub-components ----------

  const SectionHeader = ({ title, stats }: { title: string; stats: { total: number; arrived: number; pending: number } }) => (
    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5">{title}</Typography>
        <Chip label={`${stats.total}`} size="medium" variant="outlined" />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
          label={`${stats.arrived} ${t('admin.schedule.arrived')}`}
          size="small"
          color="success"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          icon={<PendingIcon sx={{ fontSize: 14 }} />}
          label={`${stats.pending} ${t('admin.schedule.pending')}`}
          size="small"
          color="warning"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Box>
    </Box>
  );

  const GuestNameCell = ({ reservation }: { reservation: Reservation }) => {
    const arrived = isArrived(reservation);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {arrived && <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />}
        <Typography variant="body2" fontWeight={arrived ? 600 : 400}>
          {getGuestName(reservation)}
        </Typography>
      </Box>
    );
  };

  const arrivedPercent = totals.totalPeople > 0 ? (totals.arrivedGuests / totals.totalPeople) * 100 : 0;

  return (
    <AdminLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <SectionTitle
          title={t('admin.schedule.title')}
          right={
            <ToggleButtonGroup value={period} exclusive onChange={(_, val) => val && setPeriod(val)} size="small">
              <ToggleButton value="today">{t('admin.schedule.today')}</ToggleButton>
              <ToggleButton value="tomorrow">{t('admin.schedule.tomorrow')}</ToggleButton>
            </ToggleButtonGroup>
          }
        />

        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          {formatDate(selectedDate.toDate())}
        </Typography>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* 1st — Arrived */}
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', borderTop: 3, borderColor: 'success.main' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon sx={{ color: 'success.main' }} />
                  <Typography variant="subtitle2" color="text.secondary">{t('admin.schedule.cards.arrivedProgress')}</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} color="success.main">{totals.arrivedGuests}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={arrivedPercent}
                  color="success"
                  sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          {/* 2nd — Pending */}
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', borderTop: 3, borderColor: 'warning.main' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <PendingIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="subtitle2" color="text.secondary">{t('admin.schedule.cards.pendingGuests')}</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} color="warning.dark">{totals.pendingGuests}</Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* 3rd — Total People */}
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', borderTop: 3, borderColor: 'primary.main' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <PeopleIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle2" color="text.secondary">{t('admin.schedule.cards.totalPeople')}</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700}>{totals.totalPeople}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Reservation Tables */}
        <Grid container spacing={3}>
          {/* DayPass */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ overflow: 'hidden' }}>
              <SectionHeader title={t('admin.schedule.sections.daypassTitle')} stats={categoryStats.daypass} />
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t('admin.schedule.table.guest')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.status')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.totalGuests')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categorized.daypass.map(r => {
                    const arrived = isArrived(r);
                    return (
                      <TableRow
                        key={r._id}
                        sx={{
                          bgcolor: arrived ? (theme) => alpha(theme.palette.success.main, 0.04) : 'transparent',
                          borderLeft: arrived ? 3 : 0,
                          borderColor: 'success.main',
                        }}
                      >
                        <TableCell><GuestNameCell reservation={r} /></TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={arrived ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <PendingIcon sx={{ fontSize: 14 }} />}
                            label={arrived ? t('admin.schedule.arrivedLabel') : t('admin.schedule.pendingLabel')}
                            size="small"
                            color={arrived ? 'success' : 'warning'}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>{getTotalGuests(r)}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {categorized.daypass.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {t('admin.schedule.empty.daypass')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Right column: Accommodations + Events */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'grid', gap: 3 }}>
              {/* Accommodations */}
              <Paper elevation={1} sx={{ overflow: 'hidden' }}>
                <SectionHeader title={t('admin.schedule.sections.accommodationsTitle')} stats={categoryStats.rooms} />
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.schedule.table.guest')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.schedule.table.room')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.status')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.totalGuests')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categorized.rooms.map(r => {
                      const arrived = isArrived(r);
                      const roomName = r.room && typeof r.room === 'object' ? (r.room as any).name : '';
                      return (
                        <TableRow
                          key={r._id}
                          sx={{
                            bgcolor: arrived ? (theme) => alpha(theme.palette.success.main, 0.04) : 'transparent',
                            borderLeft: arrived ? 3 : 0,
                            borderColor: 'success.main',
                          }}
                        >
                          <TableCell><GuestNameCell reservation={r} /></TableCell>
                          <TableCell>{roomName || t('admin.schedule.notAssigned')}</TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={arrived ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <PendingIcon sx={{ fontSize: 14 }} />}
                              label={arrived ? t('admin.schedule.arrivedLabel') : t('admin.schedule.pendingLabel')}
                              size="small"
                              color={arrived ? 'success' : 'warning'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>{getTotalGuests(r)}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {categorized.rooms.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          {t('admin.schedule.empty.rooms')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>

              {/* Events */}
              <Paper elevation={1} sx={{ overflow: 'hidden' }}>
                <SectionHeader title={t('admin.schedule.sections.eventsTitle')} stats={categoryStats.events} />
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
                      <TableCell sx={{ fontWeight: 600 }}>{t('admin.schedule.table.guest')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.status')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{t('admin.schedule.table.totalGuests')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categorized.events.map(r => {
                      const arrived = isArrived(r);
                      return (
                        <TableRow
                          key={r._id}
                          sx={{
                            bgcolor: arrived ? (theme) => alpha(theme.palette.success.main, 0.04) : 'transparent',
                            borderLeft: arrived ? 3 : 0,
                            borderColor: 'success.main',
                          }}
                        >
                          <TableCell><GuestNameCell reservation={r} /></TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={arrived ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <PendingIcon sx={{ fontSize: 14 }} />}
                              label={arrived ? t('admin.schedule.arrivedLabel') : t('admin.schedule.pendingLabel')}
                              size="small"
                              color={arrived ? 'success' : 'warning'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>{getTotalGuests(r)}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {categorized.events.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          {t('admin.schedule.empty.events')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </AdminLayout>
  );
};

export default ScheduleSummary;