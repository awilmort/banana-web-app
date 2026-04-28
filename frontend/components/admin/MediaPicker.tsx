'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from '@mui/material';
import { mediaService, resolveMediaUrl } from '@/lib/api';
import { MediaItem } from '@/types';
import { useTranslation } from 'react-i18next';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  categoryFilter?: string;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ open, onClose, onSelect, multiple = true, categoryFilter }) => {
  const { t } = useTranslation();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(categoryFilter || 'all');

  const loadMedia = useCallback(async () => {
    const params: any = { type: 'image', limit: 100 };
    if (category !== 'all') params.category = category;
    const res = await mediaService.getMedia(params);
    setMedia(res.data.data || []);
  }, [category]);

  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open, category, loadMedia]);

  const toggleSelect = (url: string) => {
    if (multiple) {
      setSelected((prev) => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
    } else {
      setSelected([url]);
    }
  };

  const filtered = media.filter(m =>
    (m.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const getUrl = (url: string) => resolveMediaUrl(url);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('admin.media.picker.title', 'Select Media')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label={t('admin.media.picker.searchLabel', 'Search by title')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>{t('admin.media.labels.category', 'Category')}</InputLabel>
            <Select value={category} label={t('admin.media.labels.category', 'Category')} onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="all">{t('admin.media.picker.allCategories', 'All')}</MenuItem>
              <MenuItem value="rooms">{t('admin.media.categories.rooms', 'Rooms')}</MenuItem>
              <MenuItem value="aquapark">{t('admin.media.categories.aquapark', 'Aquapark')}</MenuItem>
              <MenuItem value="facilities">{t('admin.media.categories.facilities', 'Facilities')}</MenuItem>
              <MenuItem value="dining">{t('admin.media.categories.dining', 'Dining')}</MenuItem>
              <MenuItem value="activities">{t('admin.media.categories.activities', 'Activities')}</MenuItem>
              <MenuItem value="general">{t('admin.media.categories.general', 'General')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Grid container spacing={2}>
          {filtered.map((item) => {
            const isSelected = selected.includes(item.url);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                <Card variant={isSelected ? 'outlined' : undefined} sx={{ borderColor: isSelected ? 'primary.main' : undefined }}>
                  <CardActionArea onClick={() => toggleSelect(item.url)}>
                    <CardMedia component="img" height="140" image={getUrl(item.url)} alt={item.title} />
                    <CardContent>
                      <Typography variant="subtitle2" noWrap>{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button variant="contained" onClick={() => { onSelect(selected); onClose(); }} disabled={selected.length === 0}>{t('admin.media.picker.select', 'Select')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaPicker;