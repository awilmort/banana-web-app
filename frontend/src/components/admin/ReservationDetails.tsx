import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Container, Divider, Grid, Paper, Typography, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Reservation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { reservationsService } from '../../services/api';

type Props = {
  reservation: Reservation;
  onBack: () => void;
  onUpdated?: (updated: Reservation) => void;
};

const ReservationDetails: React.FC<Props> = ({ reservation, onBack, onUpdated }) => {
  const [current, setCurrent] = useState<Reservation>(reservation);
  useEffect(() => { setCurrent(reservation); }, [reservation]);
  const { user } = useAuth();
  const isAdmin = String(user?.role).toLowerCase() === 'admin';

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
        <Typography variant="h5">Reservation Details</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                const ok = window.confirm('This will permanently remove the reservation. Continue?');
                if (!ok) return;
                try {
                  await reservationsService.deleteReservation(current._id);
                  if (onUpdated) onUpdated(current);
                  onBack();
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Failed to remove reservation');
                }
              }}
            >
              Delete Reservation
            </Button>
          )}
          <Button variant="outlined" onClick={onBack}>Back to Reservations</Button>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" gutterBottom>{guestName}</Typography>
            <Typography variant="body2" color="text.secondary">{current.contactInfo?.email} • {current.contactInfo?.phone}</Typography>
          </Box>
          <Chip label={current.status} color={getStatusColor(current.status) as any} sx={{ textTransform: 'capitalize' }} />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Reservation</Typography>
            <Box sx={{ pl: 1 }}>
              <Typography variant="body2"><strong>Type:</strong> {current.type}</Typography>
              <Typography variant="body2"><strong>Dates:</strong> {formatDate(current.checkInDate)} {current.checkOutDate ? `- ${formatDate(current.checkOutDate)}` : ''}</Typography>
              <Typography variant="body2"><strong>Guests:</strong> {current.guestDetails.adults} Adults, {current.guestDetails.children} Children, {current.guestDetails.infants} Infants</Typography>
              {current.reservationCode && (
                <Typography variant="body2"><strong>Reservation Code:</strong> {current.reservationCode}</Typography>
              )}
              <Typography variant="body2"><strong>Status:</strong> {current.status}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Payment</Typography>
            <Box sx={{ pl: 1 }}>
              <Typography variant="body2"><strong>Total:</strong> ${current.totalPrice}</Typography>
              <Typography variant="body2"><strong>Total Payments:</strong> {current.totalPayments ?? 0}</Typography>
              <Typography variant="body2"><strong>Pending Balance:</strong> {pendingBalance}</Typography>
            </Box>
          </Grid>
          {current.type === 'room' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Operational</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2"><strong>Actual Check-In:</strong> {formatDateTime(current.actualCheckInAt)}</Typography>
                <Typography variant="body2"><strong>Actual Check-Out:</strong> {formatDateTime(current.actualCheckOutAt)}</Typography>
              </Box>
            </Grid>
          )}
          {current.type === 'event' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Event</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2"><strong>Event Type:</strong> {current.eventType}</Typography>
                {current.eventDescription && (
                  <Typography variant="body2"><strong>Description:</strong> {current.eventDescription}</Typography>
                )}
              </Box>
            </Grid>
          )}
          {current.type === 'room' && current.room && typeof current.room === 'object' && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Room</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2"><strong>Assigned Room:</strong> {current.room.name}</Typography>
              </Box>
            </Grid>
          )}
          {current.specialRequests && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Special Requests</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2">{current.specialRequests}</Typography>
              </Box>
            </Grid>
          )}

          {/* Payments Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">Payments</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">Pending Balance: {pendingBalance}</Typography>
                <Button variant="contained" onClick={() => { setSubmitError(null); setSubmitSuccess(null); setAmount(0); setMethod(''); setNote(''); setPaymentDialogOpen(true); }}>Add Payment</Button>
              </Box>
            </Box>

            {/* Payments Table */}
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(current.payments) && current.payments.length > 0 ? (
                    current.payments.map((p) => (
                      <TableRow key={(p as any)._id || `${p.createdAt}-${p.amount}`}>
                        <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{p.method}</TableCell>
                        <TableCell align="right">${p.amount.toFixed(2)}</TableCell>
                        <TableCell>{p.note || '-'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
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
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={async () => {
                              const ok = window.confirm('Delete this payment?');
                              if (!ok) return;
                              try {
                                const res = await reservationsService.deleteReservationPayment(current._id, (p as any)._id);
                                const updated = res.data.data as Reservation;
                                setCurrent(updated);
                                if (onUpdated) onUpdated(updated);
                              } catch (err: any) {
                                setSubmitError(err?.response?.data?.message || 'Failed to delete payment');
                              }
                            }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No payments recorded</TableCell>
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
      <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, 1fr)', mt: 1 }}>
          <TextField
            label="Amount"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <TextField
            select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
          >
            <MenuItem value="">Select Method</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="transfer">Transfer</MenuItem>
          </TextField>
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">Pending Balance: {pendingBalance}</Typography>
          {amount > 0 && (
            <Typography variant="caption" color={amount > pendingBalance ? 'error' : 'text.secondary'}>
              After payment: {Math.max(0, pendingBalance - amount)}
            </Typography>
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
        <Button onClick={() => setPaymentDialogOpen(false)} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          disabled={submitting || amount <= 0 || amount > pendingBalance || !method}
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
              setSubmitSuccess('Payment recorded');
              setPaymentDialogOpen(false);
              if (onUpdated) onUpdated(updated);
            } catch (err: any) {
              setSubmitError(err?.response?.data?.message || 'Failed to record payment');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {editingPayment ? 'Save Changes' : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default ReservationDetails;
