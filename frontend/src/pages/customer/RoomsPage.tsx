import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Amenity, Room } from '../../types';
import { amenitiesService, roomsService, resolveMediaUrl } from '../../services/api';
import BookingForm from '../../components/booking/BookingForm';
import { useTranslation } from 'react-i18next';

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<{
    open: boolean;
    room: Room | null;
  }>({ open: false, room: null });

  const fetchData = async () => {
    try {
      const [amenitiesResponse, roomsResponse] = await Promise.all([
        amenitiesService.getAmenities({ active: true }),
        roomsService.getRooms({ available: true })
      ]);
      setAmenities(amenitiesResponse.data.data || []);
      setRooms(roomsResponse.data.data?.rooms || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookingSuccess = (reservation: any) => {
    // Close the booking dialog
    setBookingForm({ open: false, room: null });
    // Navigate to public reservation summary using confirmation token
    const token = reservation?.confirmationToken;
    if (token) {
      navigate(`/reservation/${token}`);
    } else {
      // Fallback: go to user's reservations page
      navigate('/reservations');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t('pages.rooms.loadingAmenities')}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {t('pages.rooms.headerTitle')}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
          {t('pages.rooms.headerSubtitle')}
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => setBookingForm({ open: true, room: null })}
          sx={{
            background: 'linear-gradient(135deg, #2E7D4F 0%, #F4A460 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1B4D32 0%, #D18B47 100%)',
            },
            px: 4,
            py: 1.5,
          }}
        >
          {t('pages.rooms.headerBookNow')}
        </Button>
      </Box>

      {/* Available Rooms Section */}
      {rooms.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            {t('pages.rooms.availableTitle')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 4, maxWidth: 800, mx: 'auto' }}>
            {t('pages.rooms.availableSubtitle')}
          </Typography>
          <Grid container spacing={3}>
            {rooms.map((room) => (
              <Grid item xs={12} md={6} lg={4} key={room._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: (theme) => theme.shadows[8],
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', overflow: 'hidden', height: 200 }}>
                    <img
                      src={
                        room.images && room.images.length > 0
                          ? resolveMediaUrl(room.images[0])
                          : '/api/placeholder/400/200'
                      }
                      alt={room.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* Removed room type chip */}
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography variant="h5" component="h3" gutterBottom>
                      {room.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {room.description}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {/* Capacity removed */}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        {/* Price per night removed */}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setBookingForm({ open: true, room })}
                      sx={{
                        mt: 'auto',
                        background: 'linear-gradient(135deg, #2E7D4F 0%, #F4A460 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1B4D32 0%, #D18B47 100%)',
                        },
                      }}
                    >
                      {t('pages.rooms.bookThisRoom')}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* What's Included - Amenities Section */}
      {amenities.length > 0 && (
        <Box sx={{ mb: 6, py: 4, backgroundColor: '#f8f9fa', borderRadius: 3 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            {t('pages.rooms.includedTitle')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 4, maxWidth: 800, mx: 'auto' }}>
            {t('pages.rooms.includedSubtitle')}
          </Typography>
          <Grid container spacing={3}>
            {amenities.slice(0, 8).map((amenity) => (
              <Grid item xs={12} sm={6} md={3} key={amenity._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: (theme) => theme.shadows[8],
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={
                        amenity.image
                          ? amenity.image.startsWith('http')
                            ? amenity.image
                            : resolveMediaUrl(amenity.image)
                          : '/api/placeholder/300/200'
                      }
                      alt={amenity.name}
                      style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/300/200';
                      }}
                    />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {amenity.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {amenity.description.length > 60
                        ? `${amenity.description.substring(0, 60)}...`
                        : amenity.description}
                    </Typography>
                    <Chip
                      label={amenity.category}
                      size="small"
                      sx={{
                        mt: 1,
                        textTransform: 'capitalize',
                        fontSize: '0.75rem'
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {amenities.length > 8 && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('pages.rooms.moreAmenities', { count: amenities.length - 8 })}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Booking Form Dialog */}
      <BookingForm
        open={bookingForm.open}
        onClose={() => setBookingForm({ open: false, room: null })}
        room={bookingForm.room}
        onBookingSuccess={handleBookingSuccess}
      />
    </Container>
  );
};

export default RoomsPage;