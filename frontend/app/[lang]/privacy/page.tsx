'use client';

import React from 'react';
import {
  Box, Container, Typography, Divider, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyPage() {
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
            {t('privacy.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('privacy.lastUpdated')}
          </Typography>
        </Box>

        {/* Intro */}
        <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.9, mb: 4 }}>
          {t('privacy.intro')}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Section titleKey="privacy.s1Title" bodyKey="privacy.s1Body" />
        <Section
          titleKey="privacy.s2Title"
          bodyKey="privacy.s2Body"
          items={[
            'privacy.s2I1',
            'privacy.s2I2',
            'privacy.s2I3',
            'privacy.s2I4',
            'privacy.s2I5',
            'privacy.s2I6',
            'privacy.s2I7',
          ]}
        />
        <Section
          titleKey="privacy.s3Title"
          bodyKey="privacy.s3Body"
          items={[
            'privacy.s3I1',
            'privacy.s3I2',
            'privacy.s3I3',
            'privacy.s3I4',
            'privacy.s3I5',
          ]}
        />
        <Section titleKey="privacy.s4Title" bodyKey="privacy.s4Body" />
        <Section
          titleKey="privacy.s5Title"
          bodyKey="privacy.s5Body"
          items={[
            'privacy.s5I1',
            'privacy.s5I2',
            'privacy.s5I3',
            'privacy.s5I4',
          ]}
        />
        <Section titleKey="privacy.s6Title" bodyKey="privacy.s6Body" />
        <Section
          titleKey="privacy.s7Title"
          bodyKey="privacy.s7Body"
          items={[
            'privacy.s7I1',
            'privacy.s7I2',
            'privacy.s7I3',
            'privacy.s7I4',
            'privacy.s7I5',
            'privacy.s7I6',
          ]}
        />
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, mt: -2, mb: 4 }}>
            {t('privacy.s7Contact')}
          </Typography>
        </Box>
        <Section titleKey="privacy.s8Title" bodyKey="privacy.s8Body" />
        <Section titleKey="privacy.s9Title" bodyKey="privacy.s9Body" />
        <Section titleKey="privacy.s10Title" bodyKey="privacy.s10Body" />
        <Section titleKey="privacy.s11Title" bodyKey="privacy.s11Body" />
        <Section titleKey="privacy.s12Title" bodyKey="privacy.s12Body" />

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
            {t('privacy.s13Title')}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.8 }}>
            {t('privacy.s13Body')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
