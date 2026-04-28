'use client';

import React, { useState } from 'react';
import { Resolver } from 'react-hook-form';
import {
  Container, Typography, Grid, Card, CardContent, TextField, Button, Box, Alert,
  Paper, IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Email, Phone, LocationOn, Facebook, Twitter, Instagram, Send,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { contactService } from '@/lib/api';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const contactSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
  phone: yup.string().optional(),
  subject: yup.string().required('Subject is required').min(5, 'Subject must be at least 5 characters'),
  message: yup.string().required('Message is required').min(10, 'Message must be at least 10 characters'),
});

export default function ContactPage() {
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { control, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: yupResolver(contactSchema) as unknown as Resolver<ContactFormData>,
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      await contactService.sendMessage({ name: data.name, email: data.email, phone: data.phone || '', subject: data.subject, message: data.message });
      setSubmitStatus('success');
      reset();
    } catch { setSubmitStatus('error'); }
    finally { setIsSubmitting(false); }
  };

  const contactInfo = [
    { icon: <Phone />, title: t('pages.contact.phone'), details: ['+1 (829) 599-9540'], color: 'primary.main' },
    { icon: <Email />, title: t('pages.contact.email'), details: ['info@bananaaquapark.com'], color: 'secondary.main' },
    { icon: <LocationOn />, title: t('pages.contact.address'), details: ['Matachalupe, Higüey', 'República Dominicana, 23000'], color: 'success.main' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom>{t('pages.contact.title')}</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>{t('pages.contact.subtitle')}</Typography>
      </Box>

      <Grid container spacing={6}>
        {/* Contact Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="h4" gutterBottom>{t('pages.contact.getInTouch')}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{t('pages.contact.intro')}</Typography>
          <Box sx={{ mb: 4 }}>
            {contactInfo.map((info, index) => (
              <Card key={index} sx={{ mb: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateX(8px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', bgcolor: info.color, color: 'white', mr: 2 }}>
                      {info.icon}
                    </Box>
                    <Typography variant="h6">{info.title}</Typography>
                  </Box>
                  {info.details.map((detail, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 8 }}>{detail}</Typography>)}
                </CardContent>
              </Card>
            ))}
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>{t('pages.contact.followUs')}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton sx={{ bgcolor: '#1877F2', color: 'white', '&:hover': { bgcolor: '#166FE5' } }}><Facebook /></IconButton>
              <IconButton sx={{ bgcolor: '#1DA1F2', color: 'white', '&:hover': { bgcolor: '#1A8CD8' } }}><Twitter /></IconButton>
              <IconButton sx={{ bgcolor: '#E4405F', color: 'white', '&:hover': { bgcolor: '#D6336C' } }}><Instagram /></IconButton>
            </Box>
          </Box>
        </Grid>

        {/* Contact Form */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3, background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,249,250,0.95))' }}>
            <Typography variant="h4" gutterBottom>{t('pages.contact.sendMessage')}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{t('pages.contact.sendMessageSubtitle')}</Typography>
            {submitStatus === 'success' && <Alert severity="success" sx={{ mb: 3 }}>{t('pages.contact.success')}</Alert>}
            {submitStatus === 'error' && <Alert severity="error" sx={{ mb: 3 }}>{t('pages.contact.error')}</Alert>}
            <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="name" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label={t('pages.contact.form.fullName')} error={!!errors.name} helperText={errors.name?.message} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="email" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label={t('pages.contact.form.email')} type="email" error={!!errors.email} helperText={errors.email?.message} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="phone" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label={t('pages.contact.form.phone')} error={!!errors.phone} helperText={errors.phone?.message} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="subject" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label={t('pages.contact.form.subject')} error={!!errors.subject} helperText={errors.subject?.message} />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Controller name="message" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth label={t('pages.contact.form.message')} multiline rows={6} error={!!errors.message} helperText={errors.message?.message} />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Button type="submit" variant="contained" size="large" disabled={isSubmitting} startIcon={<Send />}
                    sx={{ py: 1.5, px: 4, background: 'linear-gradient(135deg, #2E7D4F 0%, #F4A460 100%)', '&:hover': { background: 'linear-gradient(135deg, #1B4D32 0%, #D18B47 100%)' }, '&:disabled': { background: 'linear-gradient(135deg, #ccc 0%, #999 100%)' } }}>
                    {isSubmitting ? t('pages.contact.sending') : t('pages.contact.send')}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>

      {/* Map placeholder */}
      <Box sx={{ mt: 8 }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>{t('pages.contact.findUs')}</Typography>
        <Paper elevation={4} sx={{ mt: 4, borderRadius: 3, overflow: 'hidden', bgcolor: '#f5f5f5' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d242052.31415158242!2d-68.7280879895148!3d18.570999468394838!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ea8b0d9be138b95%3A0xcc1f760ddb2c00ab!2sBANANA%20Ranch%20Villages!5e0!3m2!1sen!2sdo!4v1776963612106!5m2!1sen!2sdo"
            width="100%"
            height={isMobile ? 200 : 400}
            style={{ display: 'block', border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title={t('howToGetHere.mapAddress')}
          />
        </Paper>
      </Box>
    </Container>
  );
}
