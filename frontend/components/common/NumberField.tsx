'use client';

import React, { useEffect, useState } from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';

interface NumberFieldProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}

const NumberField: React.FC<NumberFieldProps> = ({ value, onChange, min = 0, max, onBlur, ...rest }) => {
  const [input, setInput] = useState<string>('');

  useEffect(() => {
    if (value === null || value === undefined) {
      setInput('');
    } else if (!Number.isNaN(value)) {
      setInput(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setInput(val);
      if (val !== '') {
        const num = Number(val);
        if (max !== undefined && num > max) {
          onChange(max);
          setInput(String(max));
        } else {
          onChange(num);
        }
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (input === '') {
      if (min !== undefined && min > 0) {
        setInput(String(min));
        onChange(min);
      } else {
        onChange(null);
      }
    } else {
      let num = Number(input);
      if (Number.isNaN(num)) num = min;
      if (num < min) num = min;
      if (max !== undefined && num > max) num = max;
      if (String(num) !== input) setInput(String(num));
    }
    if (typeof onBlur === 'function') onBlur(e as React.FocusEvent<HTMLInputElement>);
  };

  return (
    <TextField
      {...rest}
      type="text"
      inputMode="numeric"
      value={input}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default NumberField;
