'use client';

import React from 'react';
import {
  Box, Container, Typography, Button, Chip, Paper,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  AccessTime, LocalParking, LocationOn, Schedule,
  Hotel, PersonPin, FlightLand,
  WhatsApp, FiberManualRecord,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function HowToGetHerePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();
  const { t } = useTranslation();

  const routes = [
    {
      icon: <Hotel sx={{ fontSize: 16 }} />,
      iconBg: '#E1F5EE',
      iconColor: '#0A7A5C',
      timeColor: '#0A7A5C',
      dotColor: '#0A7A5C',
      badgeBg: '#E1F5EE',
      badgeColor: '#0F6E56',
      featured: true,
      titleKey: 'howToGetHere.route1Title',
      subKey: 'howToGetHere.route1Sub',
      timeKey: 'howToGetHere.route1Time',
      timeUnitKey: 'howToGetHere.route1TimeUnit',
      steps: ['howToGetHere.route1Step1', 'howToGetHere.route1Step2', 'howToGetHere.route1Step3'],
      badgeKey: 'howToGetHere.route1Badge',
    },
    {
      icon: <LocationOn sx={{ fontSize: 16 }} />,
      iconBg: '#E6F1FB',
      iconColor: '#185FA5',
      timeColor: '#185FA5',
      dotColor: '#185FA5',
      badgeBg: '#E6F1FB',
      badgeColor: '#185FA5',
      featured: false,
      titleKey: 'howToGetHere.route2Title',
      subKey: 'howToGetHere.route2Sub',
      timeKey: 'howToGetHere.route2Time',
      timeUnitKey: 'howToGetHere.route2TimeUnit',
      steps: ['howToGetHere.route2Step1', 'howToGetHere.route2Step2', 'howToGetHere.route2Step3'],
      badgeKey: 'howToGetHere.route2Badge',
    },
    {
      icon: <PersonPin sx={{ fontSize: 16 }} />,
      iconBg: '#FAEEDA',
      iconColor: '#854F0B',
      timeColor: '#854F0B',
      dotColor: '#854F0B',
      badgeBg: '#FAEEDA',
      badgeColor: '#854F0B',
      featured: false,
      titleKey: 'howToGetHere.route3Title',
      subKey: 'howToGetHere.route3Sub',
      timeKey: 'howToGetHere.route3Time',
      timeUnitKey: 'howToGetHere.route3TimeUnit',
      steps: ['howToGetHere.route3Step1', 'howToGetHere.route3Step2', 'howToGetHere.route3Step3'],
      badgeKey: 'howToGetHere.route3Badge',
    },
    {
      icon: <FlightLand sx={{ fontSize: 16 }} />,
      iconBg: '#F1EFE8',
      iconColor: '#5F5E5A',
      timeColor: '#444441',
      dotColor: '#444441',
      badgeBg: '#F1EFE8',
      badgeColor: '#444441',
      featured: false,
      titleKey: 'howToGetHere.route4Title',
      subKey: 'howToGetHere.route4Sub',
      timeKey: 'howToGetHere.route4Time',
      timeUnitKey: 'howToGetHere.route4TimeUnit',
      steps: ['howToGetHere.route4Step1', 'howToGetHere.route4Step2', 'howToGetHere.route4Step3'],
      badgeKey: 'howToGetHere.route4Badge',
    },
  ];

  const tips = [
    { labelKey: 'howToGetHere.tip1Label', valKey: 'howToGetHere.tip1Val' },
    { labelKey: 'howToGetHere.tip2Label', valKey: 'howToGetHere.tip2Val' },
    { labelKey: 'howToGetHere.tip3Label', valKey: 'howToGetHere.tip3Val' },
    { labelKey: 'howToGetHere.tip4Label', valKey: 'howToGetHere.tip4Val' },
    { labelKey: 'howToGetHere.tip5Label', valKey: 'howToGetHere.tip5Val' },
    { labelKey: 'howToGetHere.tip6Label', valKey: 'howToGetHere.tip6Val' },
  ];

  return (
    <Box>
      {/* ── Distance Band ── */}
      <Box sx={{ bgcolor: '#0A7A5C', py: { xs: 3.5, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', mb: 1 }}>
              {t('howToGetHere.distEyebrow')}
            </Typography>
            <Typography sx={{
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              fontSize: { xs: '2.8rem', md: '4rem' },
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1,
              letterSpacing: '0.02em',
              mb: 3,
            }}>
              {t('howToGetHere.distHeadline').split('49 MIN').map((part, i) =>
                i === 0
                  ? <React.Fragment key={i}>{part}<Box component="span" sx={{ color: '#F5C518' }}>49 MIN</Box></React.Fragment>
                  : <React.Fragment key={i}>{part}</React.Fragment>
              )}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              {[
                { icon: <AccessTime sx={{ fontSize: 16 }} />, text: t('howToGetHere.distChipTime') },
                { icon: <LocalParking sx={{ fontSize: 16 }} />, text: t('howToGetHere.distChipParking') },
                { icon: <LocationOn sx={{ fontSize: 16 }} />, text: t('howToGetHere.distChipLocation') },
                { icon: <Schedule sx={{ fontSize: 16 }} />, text: t('howToGetHere.distChipHours') },
              ].map((chip) => (
                <Chip
                  key={chip.text}
                  icon={chip.icon}
                  label={chip.text}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.12)',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    height: 36,
                    '& .MuiChip-icon': { color: '#F5C518' },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── Main content ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>

        {/* Routes */}
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 3, textAlign: 'center' }}>
          {t('howToGetHere.routesTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 5 }}>
          {routes.map((route) => (
            <Box key={route.titleKey} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' }, minWidth: 0 }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: route.featured ? `2px solid #0A7A5C` : undefined,
                }}
              >
                {/* Card header */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                      bgcolor: route.iconBg, color: route.iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {route.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary', mb: 0.25 }}>
                        {t(route.titleKey)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {t(route.subKey)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                    <Typography sx={{
                      fontFamily: '"Bebas Neue", "Impact", sans-serif',
                      fontSize: '1.8rem',
                      lineHeight: 1,
                      color: route.timeColor,
                    }}>
                      {t(route.timeKey)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.3 }}>
                      {t(route.timeUnitKey)}
                    </Typography>
                  </Box>
                </Box>

                {/* Card body */}
                <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5, flexGrow: 1 }}>
                  {route.steps.map((stepKey) => (
                    <Box key={stepKey} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.75 }}>
                      <FiberManualRecord sx={{ fontSize: 7, color: route.dotColor, mt: '6px', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }}>
                        {t(stepKey)}
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{
                    display: 'inline-block', mt: 1, px: 1.25, py: 0.5,
                    borderRadius: 10, bgcolor: route.badgeBg, color: route.badgeColor,
                    fontSize: '0.7rem', fontWeight: 500,
                  }}>
                    {t(route.badgeKey)}
                  </Box>
                </Box>
              </Paper>
            </Box>
          ))}
        </Box>

        {/* Map */}
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 5 }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d242052.31415158242!2d-68.7280879895148!3d18.570999468394838!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ea8b0d9be138b95%3A0xcc1f760ddb2c00ab!2sBANANA%20Ranch%20Villages!5e0!3m2!1sen!2sdo!4v1776963612106!5m2!1sen!2sdo"
            width="100%"
            height={isMobile ? 200 : 280}
            style={{ display: 'block', border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title={t('howToGetHere.mapAddress')}
          />
          <Box sx={{
            display: 'flex', flexWrap: 'wrap',
            borderTop: '1px solid', borderColor: 'divider',
            bgcolor: 'grey.50',
          }}>
            {[
              { val: '49', label: t('howToGetHere.distFromPC') },
              { val: '49', label: t('howToGetHere.distFromAirport') },
              { val: '106', label: t('howToGetHere.distFromSD') },
              { val: t('howToGetHere.distParking'), label: t('howToGetHere.distParkingLabel') },
            ].map((item) => (
              <Box key={item.label} sx={{ flex: '1 1 25%', textAlign: 'center', py: 1.5, px: 1 }}>
                <Typography sx={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: '1.5rem', color: '#0A7A5C', lineHeight: 1 }}>
                  {item.val}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Tips */}
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 3, textAlign: 'center' }}>
          {t('howToGetHere.tipsTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 5 }}>
          {tips.map((tip) => (
            <Box key={tip.labelKey} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.33% - 11px)' }, minWidth: 0 }}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, border: '0.5px solid', borderColor: 'divider', height: '100%' }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
                  {t(tip.labelKey)}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.5 }}>
                  {t(tip.valKey)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* WhatsApp CTA */}
        <Box sx={{
          bgcolor: 'primary.main', borderRadius: 3, p: { xs: 3, md: 4 },
          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2,
        }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 520 }}>
            {t('howToGetHere.waText')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<WhatsApp />}
            href="https://wa.me/18295999540"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              bgcolor: '#25D366',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: '#1EB657' },
            }}
          >
            {t('howToGetHere.waBtn')}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
