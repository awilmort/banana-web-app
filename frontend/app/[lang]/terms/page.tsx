'use client';

import React from 'react';
import {
  Box, Container, Typography, Divider, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function TermsOfServicePage() {
  const { t } = useTranslation();

  const Section = ({
    titleKey,
    bodyKey,
    items,
  }: {
    titleKey: string;
    bodyKey: string;
    items?: string[];
  }) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
        {t(titleKey)}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: items ? 1 : 0 }}>
        {t(bodyKey)}
      </Typography>
      {items && (
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {items.map((itemKey) => (
            <ListItem key={itemKey} disableGutters alignItems="flex-start" sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 20, mt: '7px' }}>
                <FiberManualRecord sx={{ fontSize: 7, color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={t(itemKey)}
                slotProps={{ primary: { variant: 'body2', color: 'text.secondary', sx: { lineHeight: 1.7 } } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 5, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'primary.main',
              mb: 1,
              fontSize: { xs: '1.8rem', md: '2.5rem' },
            }}
          >
            {t('terms.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('terms.lastUpdated')}
          </Typography>
        </Box>

        {/* Intro */}
        <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.9, mb: 4 }}>
          {t('terms.intro')}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Section titleKey="terms.s1Title" bodyKey="terms.s1Body" />
        <Section
          titleKey="terms.s2Title"
          bodyKey="terms.s2Body"
          items={['terms.s2I1', 'terms.s2I2', 'terms.s2I3', 'terms.s2I4']}
        />
        <Section titleKey="terms.s3Title" bodyKey="terms.s3Body" />
        <Section titleKey="terms.s4Title" bodyKey="terms.s4Body" />
        <Section titleKey="terms.s5Title" bodyKey="terms.s5Body" />
        <Section titleKey="terms.s6Title" bodyKey="terms.s6Body" />
        <Section
          titleKey="terms.s7Title"
          bodyKey="terms.s7Body"
          items={[
            'terms.s7I1',
            'terms.s7I2',
            'terms.s7I3',
            'terms.s7I4',
            'terms.s7I5',
            'terms.s7I6',
          ]}
        />
        <Section titleKey="terms.s8Title" bodyKey="terms.s8Body" />
        <Section titleKey="terms.s9Title" bodyKey="terms.s9Body" />
        <Section titleKey="terms.s10Title" bodyKey="terms.s10Body" />
        <Section titleKey="terms.s11Title" bodyKey="terms.s11Body" />
        <Section titleKey="terms.s12Title" bodyKey="terms.s12Body" />

        <Divider sx={{ mb: 4 }} />

        {/* Contact section */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: '#fff',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('terms.s13Title')}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.8 }}>
            {t('terms.s13Body')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
