'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface DateRangePickerProps {
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  onChange: (start: string, end: string) => void;
  /** Minimum selectable date (YYYY-MM-DD). Leave undefined to allow any past date. */
  minDate?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Component ─────────────────────────────────────────────────────────────────
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  minDate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // No default minDate in admin context (allow any date)
  const minDateStr = minDate ?? '';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

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
    if (selecting === 'start') {
      onChange(dateStr, '');
      setSelecting('end');
    } else {
      if (!startDate || dateStr <= startDate) {
        onChange(dateStr, '');
        setSelecting('end');
      } else {
        onChange(startDate, dateStr);
        setSelecting('start');
      }
    }
  };

  const renderMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const effectiveEnd =
      endDate ||
      (selecting === 'end' && hoverDate && startDate ? hoverDate : null);

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
            const isStart = dateStr === startDate;
            const isEnd = dateStr === endDate;
            const isRangeEdge = isStart || isEnd;

            let inRange = false;
            if (startDate && effectiveEnd) {
              const lo = startDate < effectiveEnd ? startDate : effectiveEnd;
              const hi = startDate < effectiveEnd ? effectiveEnd : startDate;
              inRange = dateStr > lo && dateStr < hi;
            }

            const sameDay = startDate === endDate && isStart;
            const borderRadius = sameDay || (!endDate && isStart)
              ? '50%'
              : isStart
              ? '50% 0 0 50%'
              : isEnd
              ? '0 50% 50% 0'
              : inRange
              ? '0'
              : '50%';

            return (
              <Box
                key={dateStr}
                onMouseEnter={() => !isPast && setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
                onClick={() => handleDayClick(dateStr)}
                sx={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isPast ? 'default' : 'pointer',
                  bgcolor: inRange
                    ? alpha(theme.palette.primary.main, 0.15)
                    : 'transparent',
                  borderRadius: inRange ? 0 : undefined,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius,
                    bgcolor: isRangeEdge
                      ? 'primary.main'
                      : 'transparent',
                    transition: 'background-color 0.1s',
                    '&:hover': !isPast && !isRangeEdge
                      ? { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                      : {},
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: isRangeEdge ? 700 : 400,
                      color: isRangeEdge
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
          gap: { xs: 0, sm: 4 },
          flexWrap: 'nowrap',
          justifyContent: 'center',
        }}
      >
        {renderMonth(viewYear, viewMonth)}
        {!isMobile && renderMonth(rightYear, rightMonth)}
      </Box>

      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}
      >
        {!startDate
          ? 'Select check-in date'
          : !endDate
          ? 'Select check-out date'
          : `${startDate} → ${endDate}`}
      </Typography>
    </Paper>
  );
};

export default DateRangePicker;
