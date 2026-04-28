'use client';

import React, { useState } from 'react';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  InputAdornment,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import NextLink from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Admin forgot-password page.
 * Will be replaced with the full CRA component in Phase 3.
 */
export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
            Forgot Password
          </Typography>
          {success ? (
            <Alert severity="success">
              Reset instructions sent. Please check your email.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                disabled={isLoading}
              >
                Send Reset Email
              </Button>
            </Box>
          )}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <NextLink href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowBack fontSize="small" />
              <Typography variant="body2" color="primary" component="span">Back to Login</Typography>
            </NextLink>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
