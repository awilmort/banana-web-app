import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Email,
  Phone,
  LocationOn,
  Facebook,
  Twitter,
  Instagram,
  Send,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const contactSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: yup
    .string()
    .optional(),
  subject: yup
    .string()
    .required('Subject is required')
    .min(5, 'Subject must be at least 5 characters'),
  message: yup
    .string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters'),
});

const ContactPage: React.FC = () => {
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: yupResolver(contactSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Contact form submitted:', data);
      setSubmitStatus('success');
      reset();
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Phone />,
      title: t('pages.contact.phone'),
      details: ['+1 (829) 599-9540'],
      color: 'primary.main',
    },
    {
      icon: <Email />,
      title: t('pages.contact.email'),
      details: ['info@bananaaquapark.com'],
      color: 'secondary.main',
    },
    {
      icon: <LocationOn />,
      title: t('pages.contact.address'),
      details: ['Matachalupe, Higüey', 'República Dominicana, 23000'],
      color: 'success.main',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {t('pages.contact.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          {t('pages.contact.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={6}>
        {/* Contact Information */}
        <Grid item xs={12} md={4}>
          <Typography variant="h4" gutterBottom>
            {t('pages.contact.getInTouch')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t('pages.contact.intro')}
          </Typography>

          {/* Contact Info Cards */}
          <Box sx={{ mb: 4 }}>
            {contactInfo.map((info, index) => (
              <Card
                key={index}
                sx={{
                  mb: 2,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateX(8px)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: info.color,
                        color: 'white',
                        mr: 2,
                      }}
                    >
                      {info.icon}
                    </Box>
                    <Typography variant="h6">{info.title}</Typography>
                  </Box>
                  {info.details.map((detail, detailIndex) => (
                    <Typography
                      key={detailIndex}
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 8 }}
                    >
                      {detail}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Social Media */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('pages.contact.followUs')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                sx={{
                  bgcolor: '#1877F2',
                  color: 'white',
                  '&:hover': { bgcolor: '#166FE5' },
                }}
              >
                <Facebook />
              </IconButton>
              <IconButton
                sx={{
                  bgcolor: '#1DA1F2',
                  color: 'white',
                  '&:hover': { bgcolor: '#1A8CD8' },
                }}
              >
                <Twitter />
              </IconButton>
              <IconButton
                sx={{
                  bgcolor: '#E4405F',
                  color: 'white',
                  '&:hover': { bgcolor: '#D6336C' },
                }}
              >
                <Instagram />
              </IconButton>
            </Box>
          </Box>
        </Grid>

        {/* Contact Form */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.95))',
            }}
          >
            <Typography variant="h4" gutterBottom>
              {t('pages.contact.sendMessage')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {t('pages.contact.sendMessageSubtitle')}
            </Typography>

            {submitStatus === 'success' && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('pages.contact.success')}
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {t('pages.contact.error')}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit as any)}>
              <Grid container spacing={3}>
                {/* Name */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('pages.contact.form.fullName')}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Email */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('pages.contact.form.email')}
                        type="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Phone */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('pages.contact.form.phone')}
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Subject */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="subject"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('pages.contact.form.subject')}
                        error={!!errors.subject}
                        helperText={errors.subject?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Message */}
                <Grid item xs={12}>
                  <Controller
                    name="message"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('pages.contact.form.message')}
                        multiline
                        rows={6}
                        error={!!errors.message}
                        helperText={errors.message?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    startIcon={<Send />}
                    sx={{
                      py: 1.5,
                      px: 4,
                      background: 'linear-gradient(135deg, #2E7D4F 0%, #F4A460 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1B4D32 0%, #D18B47 100%)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                      },
                    }}
                  >
                    {isSubmitting ? t('pages.contact.sending') : t('pages.contact.send')}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>

      {/* Map Section */}
      <Box sx={{ mt: 8 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          {t('pages.contact.findUs')}
        </Typography>
        <Paper
          elevation={4}
          sx={{
            mt: 4,
            borderRadius: 3,
            overflow: 'hidden',
            height: 400,
            bgcolor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <LocationOn sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {t('pages.contact.mapComing')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('pages.contact.mapAddress')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ContactPage;
