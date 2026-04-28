'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface SingleDatePickerProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (date: string) => void;
  /** Minimum selectable date (YYYY-MM-DD). Leave undefined to allow any past date. */
  minDate?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Component ─────────────────────────────────────────────────────────────────
const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  value,
  onChange,
  minDate,
}) => {
  const theme = useTheme();
  const minDateStr = minDate ?? '';

  const getInitialView = (dateStr: string) => {
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const initial = getInitialView(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const prevValueRef = useRef(value);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (value && !prev) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  const canGoBack = !minDateStr || (() => {
    const minD = new Date(minDateStr + 'T00:00:00');
    return (
      viewYear > minD.getFullYear() ||
      (viewYear === minD.getFullYear() && viewMonth > minD.getMonth())
    );
  })();

  const goBack = () => {
    if (!canGoBack) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (minDateStr && dateStr < minDateStr) return;
    onChange(dateStr);
  };

  const renderMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <Box sx={{ minWidth: 220 }}>
        <Typography
          variant="subtitle2"
          sx={{ textAlign: 'center', mb: 1, fontWeight: 700, letterSpacing: '0.03em' }}
        >
          {MONTH_NAMES[month]} {year}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
          {DAY_LABELS.map(dn => (
            <Typography
              key={dn}
              variant="caption"
              sx={{
                textAlign: 'center',
                color: 'text.secondary',
                fontWeight: 600,
                py: 0.25,
                fontSize: '0.7rem',
              }}
            >
              {dn}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return <Box key={`e-${year}-${month}-${idx}`} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPast = minDateStr ? dateStr < minDateStr : false;
            const isSelected = dateStr === value;

            return (
              <Box
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                sx={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isPast ? 'default' : 'pointer',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isSelected
                      ? 'primary.main'
                      : 'transparent',
                    transition: 'background-color 0.1s',
                    '&:hover': !isPast && !isSelected
                      ? { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                      : {},
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected
                        ? 'primary.contrastText'
                        : isPast
                        ? 'text.disabled'
                        : 'text.primary',
                      userSelect: 'none',
                    }}
                  >
                    {day}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={goBack} disabled={!canGoBack} size="small">
          <ChevronLeft />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={goForward} size="small">
          <ChevronRight />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: { xs: 2, sm: 4 },
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {renderMonth(viewYear, viewMonth)}
        {renderMonth(rightYear, rightMonth)}
      </Box>

      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}
      >
        {value ? `Selected: ${value}` : 'Select a date'}
      </Typography>
    </Paper>
  );
};

export default SingleDatePicker;
