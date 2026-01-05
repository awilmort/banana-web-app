import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Container, Divider, Grid, Paper, Typography, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Reservation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { reservationsService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import NumberField from '../../components/common/NumberField';

type Props = {
  reservation: Reservation;
  onBack: () => void;
  onUpdated?: (updated: Reservation) => void;
};

const ReservationDetails: React.FC<Props> = ({ reservation, onBack, onUpdated }) => {
  const [current, setCurrent] = useState<Reservation>(reservation);
  useEffect(() => { setCurrent(reservation); }, [reservation]);
  const { user, permissions } = useAuth();
  const isAdmin = String(user?.role).toLowerCase() === 'admin';
  const canManagePayments = isAdmin || (permissions || []).includes('admin.reservations.managePayments');
  const { t } = useTranslation();
  const paymentsDisabled = current.status === 'cancelled';

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return String(dateString);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return String(dateString);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value == null) return t('admin.reservations.na');
    try {
      const { formatMoney } = require('../../utils/currency');
      return formatMoney(value);
    } catch {
      return `RD$${(value || 0).toFixed(0)}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      case 'checked-in': return 'info';
      case 'checked-out': return 'default';
      default: return 'default';
    }
  };

  const guestName = `${current.guestName?.firstName || ''} ${current.guestName?.lastName || ''}`.trim() || 'Guest';

  const pendingBalance = useMemo(() => Math.max(0, (current.totalPrice || 0) - (current.totalPayments || 0)), [current]);

  // Payment form state
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'card' | 'cash' | 'transfer' | ''>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{ _id?: string; amount: number; method: 'card' | 'cash' | 'transfer'; note?: string } | null>(null);

  return (
    <>
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">{t('admin.reservations.details.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                const ok = window.confirm(t('admin.reservations.details.deleteConfirm'));
                if (!ok) return;
                try {
                  await reservationsService.deleteReservation(current._id);
                  if (onUpdated) onUpdated(current);
                  onBack();
                } catch (err: any) {
                  alert(err?.response?.data?.message || t('admin.reservations.details.errors.deleteReservationFailed'));
                }
              }}
            >
              {t('admin.reservations.details.delete')}
            </Button>
          )}
          <Button variant="outlined" onClick={onBack}>{t('admin.reservations.details.back')}</Button>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" gutterBottom>{guestName}</Typography>
            <Typography variant="body2" color="text.secondary">{current.contactInfo?.email} • {current.contactInfo?.phone}</Typography>
          </Box>
          <Chip label={t(`admin.reservations.details.status.${current.status}`)} color={getStatusColor(current.status) as any} sx={{ textTransform: 'capitalize' }} />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.reservation')}</Typography>
            <Box sx={{ pl: 1 }}>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.type')}:</strong> {current.type}</Typography>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.dates')}:</strong> {formatDate(current.checkInDate)} {current.checkOutDate ? `- ${formatDate(current.checkOutDate)}` : ''}</Typography>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.guests')}:</strong> {current.guestDetails.adults} {t('schedule.cards.adults')}, {current.guestDetails.children} {t('schedule.cards.children')}, {current.guestDetails.infants} {t('schedule.cards.infants')}</Typography>
              {current.reservationCode && (
                <Typography variant="body2"><strong>{t('admin.reservations.details.labels.reservationCode')}:</strong> {current.reservationCode}</Typography>
              )}
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.status')}:</strong> {t(`admin.reservations.details.status.${current.status}`)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.payment')}</Typography>
            <Box sx={{ pl: 1 }}>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.total')}:</strong> {formatCurrency(current.totalPrice)}</Typography>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.totalPayments')}:</strong> {formatCurrency(current.totalPayments ?? 0)}</Typography>
              <Typography variant="body2"><strong>{t('admin.reservations.details.labels.pendingBalance')}:</strong> {formatCurrency(pendingBalance)}</Typography>
              {paymentsDisabled && (
                <Typography variant="caption" color="error">{t('admin.reservations.details.paymentDialog.blockedForCancelled')}</Typography>
              )}
            </Box>
          </Grid>
          {current.type === 'room' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.operational')}</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2"><strong>{t('admin.reservations.details.labels.actualCheckIn')}:</strong> {formatDateTime(current.actualCheckInAt)}</Typography>
                <Typography variant="body2"><strong>{t('admin.reservations.details.labels.actualCheckOut')}:</strong> {formatDateTime(current.actualCheckOutAt)}</Typography>
              </Box>
            </Grid>
          )}
          {current.type === 'event' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.event')}</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2"><strong>{t('admin.reservations.details.labels.eventType')}:</strong> {current.eventType}</Typography>
                {current.eventDescription && (
                  <Typography variant="body2"><strong>{t('admin.reservations.details.labels.description')}:</strong> {current.eventDescription}</Typography>
                )}
              </Box>
            </Grid>
          )}
          {current.type === 'room' && (
            (() => {
              const names = Array.isArray(current.rooms)
                ? current.rooms.map((r: any) => (typeof r === 'object' && r?.name) ? r.name : String(r))
                : (current.room ? [(typeof current.room === 'object' && (current.room as any)?.name) ? (current.room as any).name : String(current.room)] : []);
              return (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.room')}</Typography>
                  <Box sx={{ pl: 1 }}>
                    <Typography variant="body2"><strong>{t('admin.reservations.details.labels.assignedRoom')}:</strong> {names.length > 0 ? names.join(', ') : t('admin.reservations.none')}</Typography>
                  </Box>
                </Grid>
              );
            })()
          )}
          {current.specialRequests && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>{t('admin.reservations.details.section.specialRequests')}</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2">{current.specialRequests}</Typography>
              </Box>
            </Grid>
          )}

          {/* Payments Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">{t('admin.reservations.details.section.payments')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">{t('admin.reservations.details.paymentDialog.pendingBalance', { amount: formatCurrency(pendingBalance) })}</Typography>
                  {canManagePayments && !paymentsDisabled && (
                  <Button variant="contained" onClick={() => { setSubmitError(null); setSubmitSuccess(null); setAmount(0); setMethod(''); setNote(''); setPaymentDialogOpen(true); }}>{t('admin.reservations.details.actions.addPayment')}</Button>
                )}
              </Box>
            </Box>

            {/* Payments Table */}
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin.reservations.details.table.date')}</TableCell>
                    <TableCell>{t('admin.reservations.details.table.method')}</TableCell>
                    <TableCell align="right">{t('admin.reservations.details.table.amount')}</TableCell>
                    <TableCell>{t('admin.reservations.details.table.note')}</TableCell>
                    {canManagePayments && (
                      <TableCell align="right">{t('admin.reservations.details.table.actions')}</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(current.payments) && current.payments.length > 0 ? (
                    current.payments.map((p) => (
                      <TableRow key={(p as any)._id || `${p.createdAt}-${p.amount}`}>
                        <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{t(`admin.reservations.details.paymentDialog.method${p.method.charAt(0).toUpperCase() + p.method.slice(1)}`)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.note || '-'}</TableCell>
                        {canManagePayments && (
                          <TableCell align="right">
                                {paymentsDisabled ? (
                                  <Tooltip title={t('admin.reservations.details.paymentDialog.blockedForCancelled')}>
                                    <span>
                                      <IconButton size="small" disabled>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title={t('admin.reservations.details.actions.edit')}>
                                    <IconButton size="small" onClick={() => {
                                      setEditingPayment({ _id: (p as any)._id, amount: p.amount, method: p.method, note: p.note });
                                      setAmount(p.amount);
                                      setMethod(p.method);
                                      setNote(p.note || '');
                                      setSubmitError(null);
                                      setSubmitSuccess(null);
                                      setPaymentDialogOpen(true);
                                    }}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                            <Tooltip title={t('admin.reservations.details.actions.delete')}>
                              <IconButton size="small" color="error" onClick={async () => {
                                const ok = window.confirm(t('admin.reservations.details.errors.deletePaymentConfirm'));
                                if (!ok) return;
                                try {
                                  const res = await reservationsService.deleteReservationPayment(current._id, (p as any)._id);
                                  const updated = res.data.data as Reservation;
                                  setCurrent(updated);
                                  if (onUpdated) onUpdated(updated);
                                } catch (err: any) {
                                  setSubmitError(err?.response?.data?.message || t('admin.reservations.details.errors.deletePaymentFailed'));
                                }
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManagePayments ? 5 : 4} align="center">{t('admin.reservations.details.table.noPayments')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>
    </Container>

    {/* Add Payment Dialog */}
    <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{editingPayment ? t('admin.reservations.details.paymentDialog.titleEdit') : t('admin.reservations.details.paymentDialog.titleAdd')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, 1fr)', mt: 1 }}>
          <NumberField
            label={t('admin.reservations.details.paymentDialog.amount')}
            value={amount}
            onChange={(val) => setAmount(val == null ? 0 : val)}
            min={0}
            inputProps={{ step: 0.01 }}
          />
          <TextField
            select
            label={t('admin.reservations.details.paymentDialog.method')}
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
          >
            <MenuItem value="">{t('admin.reservations.details.paymentDialog.methodSelect')}</MenuItem>
            <MenuItem value="cash">{t('admin.reservations.details.paymentDialog.methodCash')}</MenuItem>
            <MenuItem value="card">{t('admin.reservations.details.paymentDialog.methodCard')}</MenuItem>
            <MenuItem value="transfer">{t('admin.reservations.details.paymentDialog.methodTransfer')}</MenuItem>
          </TextField>
          <TextField
            label={t('admin.reservations.details.paymentDialog.noteOptional')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">{t('admin.reservations.details.paymentDialog.pendingBalance', { amount: formatCurrency(pendingBalance) })}</Typography>
          {amount > 0 && (
            (() => {
              const original = editingPayment?.amount || 0;
              const delta = amount - original;
              const willExceed = delta > pendingBalance;
              const after = Math.max(0, pendingBalance - delta);
              return (
                <Typography variant="caption" color={willExceed ? 'error' : 'text.secondary'}>
                  {t('admin.reservations.details.paymentDialog.afterPayment', { amount: formatCurrency(after) })}
                </Typography>
              );
            })()
          )}
          {submitError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>{submitError}</Typography>
          )}
          {submitSuccess && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>{submitSuccess}</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPaymentDialogOpen(false)} disabled={submitting}>{t('admin.reservations.details.actions.cancel')}</Button>
        <Button
          variant="contained"
          disabled={(() => {
            if (submitting || amount <= 0 || !method) return true;
            const original = editingPayment?.amount || 0;
            const delta = amount - original;
            return delta > pendingBalance; // prevents exceeding total price on increase
          })()}
          onClick={async () => {
            try {
              setSubmitting(true);
              setSubmitError(null);
              setSubmitSuccess(null);
              let res;
              if (editingPayment && editingPayment._id) {
                res = await reservationsService.updateReservationPayment(current._id, editingPayment._id, { amount, method: method || undefined, note: note || undefined });
              } else {
                res = await reservationsService.addReservationPayment(current._id, { amount, method: method || undefined, note: note || undefined });
              }
              const updated = res.data.data as Reservation;
              setCurrent(updated);
              setAmount(0);
              setMethod('');
              setNote('');
              setEditingPayment(null);
              setSubmitSuccess(t('admin.reservations.details.paymentDialog.recorded'));
              setPaymentDialogOpen(false);
              if (onUpdated) onUpdated(updated);
            } catch (err: any) {
              setSubmitError(err?.response?.data?.message || t('admin.reservations.details.paymentDialog.failed'));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {editingPayment ? t('admin.reservations.details.actions.saveChanges') : t('admin.reservations.details.actions.addPayment')}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default ReservationDetails;
