'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Card, CardContent,
  useTheme, useMediaQuery, Chip, Collapse,
} from '@mui/material';
import {
  AccessTime, LocalParking, LocationOn, Schedule, ArrowForward,
  CheckCircle, EmojiEvents, Star, Add, Remove,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { pricingService } from '@/lib/api';
import { findApplicablePricing, PricingRule } from '@/utils/pricing';
import { formatMoney } from '@/utils/currency';

// ─── FAQ item ──────────────────────────────────────────────────────────────
function HomeFAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:first-of-type': { borderTop: '1px solid', borderTopColor: 'divider' },
      }}
    >
      <Button
        onClick={() => setOpen((v) => !v)}
        disableRipple
        fullWidth
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          py: 2.5,
          px: 0,
          fontWeight: 600,
          fontSize: { xs: '0.95rem', md: '1.05rem' },
          color: open ? 'primary.main' : 'text.primary',
          textTransform: 'none',
          borderRadius: 0,
          '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
        }}
        aria-expanded={open}
      >
        <span>{question}</span>
        <Box
          sx={{
            flexShrink: 0,
            ml: 2,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: open ? 'primary.main' : 'divider',
            bgcolor: open ? 'primary.main' : 'transparent',
            color: open ? '#fff' : 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {open ? <Remove sx={{ fontSize: 14 }} /> : <Add sx={{ fontSize: 14 }} />}
        </Box>
      </Button>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Typography
          variant="body1"
          sx={{ pb: 2.5, color: 'text.secondary', lineHeight: 1.7 }}
        >
          {answer}
        </Typography>
      </Collapse>
    </Box>
  );
}

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'es';
  const { t } = useTranslation();

  const [afternoonAdultPrice, setAfternoonAdultPrice] = useState<number | null>(null);
  const [daypassAdultPrice, setDaypassAdultPrice] = useState<number | null>(null);
  const [stayAdultPrice, setStayAdultPrice] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date();
    const fetchPrice = async (service: 'pasatarde' | 'daypass' | 'hospedaje', setter: (v: number) => void) => {
      try {
        const res = await pricingService.getPricing({ service });
        const rules: PricingRule[] = (res.data.data as PricingRule[]) || [];
        const rule = findApplicablePricing(rules, today);
        if (rule) setter(rule.adultPrice);
      } catch { /* silently ignore */ }
    };
    fetchPrice('pasatarde', setAfternoonAdultPrice);
    fetchPrice('daypass', setDaypassAdultPrice);
    fetchPrice('hospedaje', setStayAdultPrice);
  }, []);

  const go = (path: string) => router.push(`/${lang}${path}`);

  return (
    <Box>
      {/* Hero Section */}
      <Box sx={{
        minHeight: { xs: '60vh', md: '80vh' },
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/home.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', color: 'white', maxWidth: 800, mx: 'auto' }}>
            <Typography variant={isMobile ? 'h3' : 'h1'} gutterBottom sx={{ fontWeight: 700, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {t('pages.home.heroTitle')}
            </Typography>
            <Typography variant={isMobile ? 'h6' : 'h4'} gutterBottom sx={{ mb: 4, fontWeight: 300, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {t('pages.home.heroSubtitle')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" color="inherit" size="large" onClick={() => go('/gallery')}
                sx={{ px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 600, borderRadius: 3, textTransform: 'none', borderColor: 'white', color: 'white', '&:hover': { borderColor: 'secondary.main', backgroundColor: 'rgba(244,164,96,0.1)' } }}>
                {t('pages.home.exploreGallery')}
              </Button>
            </Box>

            {/* Instagram Social Proof Badge */}
            
            {/*
            <Box
              component="a"
              href="https://www.instagram.com/bananaranchandvillages/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: { xs: 1.2, md: 1.5 },
                mt: { xs: 3, md: 4 },
                px: { xs: 2.5, md: 3 },
                py: { xs: 1.2, md: 1.5 },
                borderRadius: 10,
                bgcolor: 'rgba(255,255,255,0.13)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.22)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                },
              }}
            >
              
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="ig-grad-hero" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f09433" />
                      <stop offset="25%" stopColor="#e6683c" />
                      <stop offset="50%" stopColor="#dc2743" />
                      <stop offset="75%" stopColor="#cc2366" />
                      <stop offset="100%" stopColor="#bc1888" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad-hero)" />
                  <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
                </svg>
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography sx={{
                  fontSize: { xs: '0.85rem', md: '0.95rem' },
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: 'white',
                  letterSpacing: '0.01em',
                }}>
                  {t('pages.home.instaBadge')}
                </Typography>
                <Typography sx={{
                  fontSize: { xs: '0.7rem', md: '0.75rem' },
                  opacity: 0.8,
                  lineHeight: 1.3,
                  color: 'white',
                }}>
                  {t('pages.home.instaCta')}
                </Typography>
              </Box>
            </Box>
            */}

          </Box>
        </Container>
      </Box>

      {/* Distance Band */}
      <Box sx={{ bgcolor: '#0A7A5C', py: { xs: 3, md: 4 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>
                {t('pages.home.distEyebrow')}
              </Typography>
              <Typography sx={{
                fontFamily: '"Bebas Neue", "Impact", sans-serif',
                fontSize: { xs: '2.4rem', md: '3rem' },
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}>
                {t('pages.home.distHeadline').split('49 MIN').map((part, i) =>
                  i === 0
                    ? <React.Fragment key={i}>{part}<Box component="span" sx={{ color: '#F5C518' }}>49 MIN</Box></React.Fragment>
                    : <React.Fragment key={i}>{part}</React.Fragment>
                )}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[
                { icon: <AccessTime sx={{ fontSize: 16 }} />, text: t('pages.home.distChipTime') },
                { icon: <LocalParking sx={{ fontSize: 16 }} />, text: t('pages.home.distChipParking') },
                { icon: <LocationOn sx={{ fontSize: 16 }} />, text: t('pages.home.distChipLocation') },
                { icon: <Schedule sx={{ fontSize: 16 }} />, text: t('pages.home.distChipHours') },
              ].map((chip) => (
                <Chip
                  key={chip.text}
                  icon={chip.icon}
                  label={chip.text}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.12)',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: '#F5C518' },
                  }}
                />
              ))}
            </Box>
            <Button
              variant="outlined"
              endIcon={<ArrowForward />}
              onClick={() => go('/how-to-get-here')}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { borderColor: '#F5C518', color: '#F5C518', bgcolor: 'transparent' },
              }}
            >
              {t('pages.home.distCta')}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Comparison Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
            {t('pages.home.welcomeTitle')}
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
            {t('pages.home.welcomeBody')}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            {t('pages.home.comparisonTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            {t('pages.home.comparisonSubtitle')}
          </Typography>
        </Box>

        {/* Three comparison cards */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { md: 'stretch' }, pt: 2 }}>

          {/* Afternoon Pass */}
          <Card sx={{
            flex: 1, borderRadius: 3,
            border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 6 },
          }}>
            <Box sx={{ bgcolor: 'primary.light', py: 2, px: 3, borderRadius: '12px 12px 0 0' }}>
              <Typography variant="overline" sx={{ color: 'primary.contrastText', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>
                {t('pages.home.compAfternoonTime')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.contrastText' }}>
                {t('pages.home.compAfternoonTitle')}
              </Typography>
            </Box>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3 }}>
              {/* Price */}
              <Box sx={{ mb: 1 }}>
                {afternoonAdultPrice !== null ? (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('pages.home.compFromLabel')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {formatMoney(afternoonAdultPrice)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.home.compPerPerson')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>—</Typography>
                )}
              </Box>
              {/* Features */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
                {[
                  t('pages.home.compFeatureAquaPark'),
                  t('pages.home.compFeaturePools'),
                  t('pages.home.compFeatureBasketball'),
                  t('pages.home.compFeatureVillar'),
                  t('pages.home.compFeaturePingPong'),
                ].map((f) => (
                  <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2">{f}</Typography>
                  </Box>
                ))}
              </Box>
              <Button variant="outlined" color="primary" fullWidth onClick={() => go('/pasatarde')}
                sx={{ mt: 3, py: 1.5, fontWeight: 600, borderRadius: 2, textTransform: 'none' }}>
                {t('pages.home.compCtaAfternoon')}
              </Button>
            </CardContent>
          </Card>

          {/* Day Pass */}
          <Card sx={{
            flex: 1, borderRadius: 3,
            border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 6 },
          }}>
            <Box sx={{ bgcolor: 'secondary.main', py: 2, px: 3, borderRadius: '12px 12px 0 0' }}>
              <Typography variant="overline" sx={{ color: 'secondary.contrastText', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>
                {t('pages.home.compDayTime')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.contrastText' }}>
                {t('pages.home.compDayTitle')}
              </Typography>
            </Box>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3 }}>
              {/* Price */}
              <Box sx={{ mb: 1 }}>
                {daypassAdultPrice !== null ? (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('pages.home.compFromLabel')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.dark', lineHeight: 1 }}>
                      {formatMoney(daypassAdultPrice)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.home.compPerPerson')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.dark' }}>—</Typography>
                )}
              </Box>
              {/* Features */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
                {([
                  { text: t('pages.home.compFeatureAquaPark') },
                  { text: t('pages.home.compFeaturePools') },
                  { text: t('pages.home.compFeatureBasketball') },
                  { text: t('pages.home.compFeatureVillar') },
                  { text: t('pages.home.compFeaturePingPong') },
                  { text: t('pages.home.compFeatureLunch'), bold: true },
                ] as { text: string; bold?: boolean }[]).map(({ text, bold }) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {bold
                      ? <Star sx={{ color: '#F06944', fontSize: 16 }} />
                      : <CheckCircle sx={{ color: '#F06944', fontSize: 18 }} />
                    }
                    <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
              <Button variant="outlined" fullWidth onClick={() => go('/daypass')}
                sx={{ mt: 3, py: 1.5, fontWeight: 600, borderRadius: 2, textTransform: 'none', color: '#F06944', borderColor: '#F06944', '&:hover': { borderColor: '#d4562f', color: '#d4562f', bgcolor: 'rgba(240,105,68,0.05)' } }}>
                {t('pages.home.compCtaDay')}
              </Button>
            </CardContent>
          </Card>

          {/* Stay — Recommended */}
          <Card sx={{
            flex: 1, borderRadius: 3,
            border: '2px solid', borderColor: 'primary.main',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            overflow: 'visible',
            boxShadow: 10,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 16 },
          }}>
            {/* Recommended badge */}
            <Box sx={{
              position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
              bgcolor: 'primary.main', color: 'primary.contrastText',
              px: 2.5, py: 0.6, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 0.5,
              boxShadow: 3, zIndex: 1,
            }}>
              <EmojiEvents sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {t('pages.home.compBadgeRecommended')}
              </Typography>
            </Box>
            <Box sx={{
              background: 'linear-gradient(135deg, #0A7A5C 0%, #1db87c 100%)',
              py: 2, px: 3, borderRadius: '10px 10px 0 0',
            }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: '0.1em' }}>
                {t('pages.home.compStayTime')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                {t('pages.home.compStayTitle')}
              </Typography>
            </Box>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3 }}>
              {/* Price */}
              <Box sx={{ mb: 1 }}>
                {stayAdultPrice !== null ? (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('pages.home.compFromLabel')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {formatMoney(stayAdultPrice)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.home.compPerNight')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>—</Typography>
                )}
              </Box>
              {/* Features */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
                {([
                  { text: t('pages.home.compFeatureAquaPark') },
                  { text: t('pages.home.compFeaturePools') },
                  { text: t('pages.home.compFeatureBasketball') },
                  { text: t('pages.home.compFeatureVillar') },
                  { text: t('pages.home.compFeaturePingPong') },
                  { text: t('pages.home.compFeatureLunch') },
                  { text: t('pages.home.compFeatureVilla'), bold: true },
                  { text: t('pages.home.compFeatureMeals'), bold: true },
                ] as { text: string; bold?: boolean }[]).map(({ text, bold }) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {bold
                      ? <Star sx={{ color: 'primary.main', fontSize: 16 }} />
                      : <CheckCircle sx={{ color: 'primary.main', fontSize: 18 }} />
                    }
                    <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 500 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
              <Button variant="contained" color="primary" fullWidth onClick={() => go('/rooms')}
                sx={{ mt: 3, py: 1.5, fontWeight: 700, borderRadius: 2, textTransform: 'none', fontSize: '1rem' }}>
                {t('pages.home.compCtaStay')}
              </Button>
            </CardContent>
          </Card>

        </Box>
      </Container>

      {/* FAQ Section */}
      <Box sx={{ bgcolor: '#F8F4ED', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
              {t('pages.home.faqTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              {t('pages.home.faqSubtitle')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              { q: t('pages.home.faqQ1'), a: t('pages.home.faqA1') },
              { q: t('pages.home.faqQ2'), a: t('pages.home.faqA2') },
              { q: t('pages.home.faqQ3'), a: t('pages.home.faqA3') },
              { q: t('pages.home.faqQ4'), a: t('pages.home.faqA4') },
              { q: t('pages.home.faqQ5'), a: t('pages.home.faqA5') },
            ] as { q: string; a: string }[]).map(({ q, a }, i) => (
              <HomeFAQItem key={i} question={q} answer={a} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>{t('pages.home.ctaTitle')}</Typography>
            <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 300, opacity: 0.9 }}>{t('pages.home.ctaBody')}</Typography>
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" color="secondary" size="large" onClick={() => go('/rooms')}
                sx={{ px: 4, py: 1.5, fontSize: '1.2rem', fontWeight: 600, borderRadius: 3, textTransform: 'none' }}>
                {t('pages.home.ctaBookStay')}
              </Button>
              <Button variant="outlined" color="inherit" size="large" onClick={() => go('/contact')}
                sx={{ px: 4, py: 1.5, fontSize: '1.2rem', fontWeight: 600, borderRadius: 3, textTransform: 'none', borderColor: 'white', color: 'white', '&:hover': { borderColor: 'secondary.main', backgroundColor: 'rgba(244,164,96,0.1)' } }}>
                {t('pages.home.ctaContact')}
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
