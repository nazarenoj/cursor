import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { WhatsAppBaileysStatus } from '../types';

const INTERVAL_MS = 12000;

const estadoError: WhatsAppBaileysStatus = {
  connected: false,
  needsQR: false,
  reachable: false,
  serviceError: 'No se pudo consultar el estado del servicio',
};

export function useWhatsAppBaileysStatus(enabled: boolean) {
  const [status, setStatus] = useState<WhatsAppBaileysStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await apiService.getWhatsAppBaileysStatus();
      setStatus(s);
    } catch {
      setStatus(estadoError);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  const refrescar = useCallback(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { status, refrescar };
}
