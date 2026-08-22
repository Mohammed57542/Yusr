import { useEffect, useState } from 'react';
import { api } from '../api/client';

let cache = null;

export default function useSettings() {
  const [settings, setSettings] = useState(cache || {});
  useEffect(() => {
    if (cache) return;
    api.get('/settings').then((s) => { cache = s; setSettings(s); }).catch(() => {});
  }, []);
  return settings;
}

export const DEFAULT_WHATSAPP = '96877353192';
export const DEFAULT_CHANNEL = 'https://whatsapp.com/channel/0029VaAeZNtIt5s0lepM5T0V';
export const DEFAULT_INSTAGRAM = 'https://www.instagram.com/yusredu.om';

export function waLink(text, settings) {
  const number = (settings && settings.whatsapp_number) || DEFAULT_WHATSAPP;
  return `https://wa.me/${number}?text=${encodeURIComponent(text || '')}`;
}