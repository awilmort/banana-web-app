'use client';

import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { Photo, Group, Celebration, Star, People } from '@mui/icons-material';
import { MediaContent } from './MediaManagement';
import { RolesContent } from './RolesManagement';
import { EventTypesContent } from './EventTypesManagement';
import { AmenitiesContent } from './AmenitiesManagement';
import { UsersContent } from './UsersManagement';
import { useTranslation } from 'react-i18next';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: t('admin.nav.media'), icon: <Photo /> },
    { label: t('admin.nav.roles'), icon: <Group /> },
    { label: t('admin.nav.eventTypes'), icon: <Celebration /> },
    { label: t('admin.nav.amenities'), icon: <Star /> },
    { label: t('admin.nav.users'), icon: <People /> },
  ];

  return (
    <>
      <Box sx={{ px: 3, pt: 3, pb: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 700,  mb: 2  }}>
          {t('admin.nav.settings')}
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_, newVal) => setTab(newVal)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500 },
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>
        </Box>
      </Box>

      <TabPanel value={tab} index={0}><MediaContent /></TabPanel>
      <TabPanel value={tab} index={1}><RolesContent /></TabPanel>
      <TabPanel value={tab} index={2}><EventTypesContent /></TabPanel>
      <TabPanel value={tab} index={3}><AmenitiesContent /></TabPanel>
      <TabPanel value={tab} index={4}><UsersContent /></TabPanel>

    </>
  );
};

export default Settings;
