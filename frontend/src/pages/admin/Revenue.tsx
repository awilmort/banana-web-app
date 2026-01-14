import React, { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Grid, Card, CardContent, Box, Paper, TextField, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { AttachMoney, Group, Payments } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/currency';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/api';

type RevenueData = {
  filters: { from: string; to: string };
  categories: Record<'room' | 'daypass' | 'event' | 'pasatarde', { adults: number; children: number; guests: number; revenue: number }>;
  income: { total: number; cash: number; transfer: number; card: number };
  pending: Array<{ id: string; type: 'room' | 'daypass' | 'PasaTarde' | 'event'; guest: string; endedOn: string; balanceDue: number; totalPrice: number; totalPayments: number }>;
};

const CombinedStatCard = ({ title, adults, children, revenue, color }: { title: string; adults: number; children: number; revenue: number; color: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group sx={{ color }} />
          <Typography variant="h6">{adults.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group sx={{ color: 'warning.main' }} />
          <Typography variant="h6">{children.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoney sx={{ color: 'success.main' }} />
          <Typography variant="h6">{formatMoney(revenue)}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const StatCard = ({ title, guests, revenue, color }: { title: string; guests: number; revenue: number; color: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Group sx={{ color }} />
          <Typography variant="h6">{guests.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoney sx={{ color: 'success.main' }} />
          <Typography variant="h6">{formatMoney(revenue)}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const IncomeCard = ({ title, amount, highlight }: { title: string; amount: number; highlight?: boolean }) => (
  <Card sx={{ height: '100%', border: highlight ? '2px solid #4caf50' : undefined }}>
    <CardContent>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Payments color={highlight ? 'success' : 'primary'} />
        <Typography variant="h4">{formatMoney(amount)}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const Revenue: React.FC = () => {
  const { t } = useTranslation();
  const [from, setFrom] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState<RevenueData | null>(null);
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const loadData = async () => {
    try {
      const res = await adminService.getRevenue({ from, to });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error('Revenue fetch error:', e);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    // Prevent future dates
    const fromClamped = dayjs(from).isAfter(today) ? today : from;
    const toClamped = dayjs(to).isAfter(today) ? today : to;
    setFrom(fromClamped);
    setTo(toClamped);
    setTimeout(loadData, 0);
  };

  const cat = data?.categories;
  const income = data?.income;

  return (
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t('admin.revenue.title')}
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label={t('admin.revenue.filters.from')}
              type="date"
              value={from}
              inputProps={{ max: today }}
              onChange={(e) => setFrom(e.target.value)}
            />
            <TextField
              label={t('admin.revenue.filters.to')}
              type="date"
              value={to}
              inputProps={{ max: today }}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button variant="contained" onClick={applyFilters}>
              {t('admin.revenue.filters.apply')}
            </Button>
          </Box>
        </Paper>

        {/* Category cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <CombinedStatCard title={t('admin.revenue.cards.daypass')} adults={cat?.daypass.adults || 0} children={cat?.daypass.children || 0} revenue={cat?.daypass.revenue || 0} color={'primary.main'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <CombinedStatCard title={t('admin.revenue.cards.room')} adults={cat?.room.adults || 0} children={cat?.room.children || 0} revenue={cat?.room.revenue || 0} color={'info.main'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title={t('admin.revenue.cards.events')} guests={cat?.event.guests || 0} revenue={cat?.event.revenue || 0} color={'success.main'} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title={t('admin.revenue.cards.pasatarde')} guests={cat?.pasatarde.guests || 0} revenue={cat?.pasatarde.revenue || 0} color={'error.main'} />
          </Grid>
        </Grid>

        {/* Income summary */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IncomeCard title={t('admin.revenue.summary.totalIncomeCash')} amount={income?.cash || 0} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IncomeCard title={t('admin.revenue.summary.totalIncomeTransfers')} amount={income?.transfer || 0} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IncomeCard title={t('admin.revenue.summary.totalIncomeCard')} amount={income?.card || 0} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IncomeCard title={t('admin.revenue.summary.totalIncome')} amount={income?.total || 0} highlight />
          </Grid>
        </Grid>

        {/* Pending payments */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {t('admin.revenue.pending.title')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.revenue.pending.table.guest')}</TableCell>
                  <TableCell>{t('admin.revenue.pending.table.type')}</TableCell>
                  <TableCell>{t('admin.revenue.pending.table.endedOn')}</TableCell>
                  <TableCell>{t('admin.revenue.pending.table.balanceDue')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.pending?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.guest}</TableCell>
                    <TableCell>
                      <Chip label={t(`admin.revenue.typeLabels.${r.type === 'PasaTarde' ? 'pasatarde' : r.type}`)} size="small" />
                    </TableCell>
                    <TableCell>{r.endedOn ? dayjs(r.endedOn).format('YYYY-MM-DD') : '-'}</TableCell>
                    <TableCell>{formatMoney(r.balanceDue || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </AdminLayout>
  );
};

export default Revenue;