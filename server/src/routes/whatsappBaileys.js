const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { registrarAuditoria } = require('../middleware/auditoria');
const serverPkg = require('../../package.json');
const { getAppVersion } = require('../appVersion');

const router = express.Router();

router.use(authenticateToken);
router.use(registrarAuditoria);

const requireWhatsAppEnviar = async (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }
  const socios = await checkPermission(req.user.id, 'socios.whatsapp');
  const liq = await checkPermission(req.user.id, 'liquidaciones.whatsapp');
  if (!socios && !liq) {
    return res.status(403).json({
      message: 'Se requiere permiso de envío por WhatsApp (socios o liquidaciones).',
    });
  }
  next();
};

function isEmbedded() {
  const v = String(process.env.WHATSAPP_EMBEDDED || '').toLowerCase();
  return v === 'true' || process.env.WHATSAPP_EMBEDDED === '1';
}

function serviceBase() {
  const u = process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:4002';
  return String(u).trim().replace(/\/$/, '');
}

function fetchWithTimeout(url, options = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

router.get(
  '/status',
  requireWhatsAppEnviar,
  asyncHandler(async (_req, res) => {
    if (isEmbedded()) {
      const { getStatus } = require('../whatsappEmbedded/baileys');
      const { getQueueLength } = require('../whatsappEmbedded/queue');
      try {
        const status = await getStatus();
        const queueLength = getQueueLength();
        res.json({
          ...status,
          queueLength,
          appVersion: getAppVersion(),
          serverPackageVersion: serverPkg.version,
          reachable: true,
          serviceURL: 'embedded',
        });
      } catch (e) {
        res.status(200).json({
          connected: false,
          needsQR: false,
          reachable: true,
          serviceError: e.message,
          serviceURL: 'embedded',
          appVersion: getAppVersion(),
        });
      }
      return;
    }

    const base = serviceBase();
    try {
      const r = await fetchWithTimeout(`${base}/status`, {}, 8000);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(200).json({
          connected: false,
          needsQR: false,
          reachable: true,
          serviceError: data.error || r.statusText,
          serviceURL: base,
          appVersion: getAppVersion(),
        });
      }
      res.json({
        ...data,
        reachable: true,
        serviceURL: base,
        appVersion: getAppVersion(),
        serverPackageVersion: serverPkg.version,
      });
    } catch (e) {
      res.status(200).json({
        connected: false,
        needsQR: false,
        reachable: false,
        serviceError: e.message || 'No se alcanzó el servicio WhatsApp',
        serviceURL: base,
        appVersion: getAppVersion(),
      });
    }
  }),
);

router.post(
  '/send-batch',
  requireWhatsAppEnviar,
  asyncHandler(async (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Se requiere items (array no vacío)' });
    }
    if (items.length > 80) {
      return res.status(400).json({ message: 'Máximo 80 destinatarios por lote' });
    }

    if (isEmbedded()) {
      const { enqueue } = require('../whatsappEmbedded/queue');
      const results = [];
      for (const it of items) {
        const phone = String(it.phone || '').trim();
        const caption = it.caption != null ? String(it.caption) : '';
        const documentBase64 = it.documentBase64;
        let fileName = it.fileName ? String(it.fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') : 'adjunto.pdf';
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName += '.pdf';
        }
        if (!phone) {
          results.push({ success: false, error: 'Sin teléfono' });
          continue;
        }
        try {
          if (documentBase64 && String(documentBase64).length > 0) {
            enqueue({
              type: 'document',
              phone,
              options: {
                caption: caption || undefined,
                document: { buffer: documentBase64 },
                fileName,
                mimetype: it.mimetype || 'application/pdf',
              },
            });
          } else {
            enqueue({
              type: 'text',
              phone,
              text: caption,
            });
          }
          results.push({ success: true });
        } catch (e) {
          results.push({
            success: false,
            error: e.message || 'Error desconocido',
          });
        }
      }
      const ok = results.filter((x) => x.success).length;
      return res.json({ ok, total: results.length, results });
    }

    const base = serviceBase();
    const results = [];

    for (const it of items) {
      const phone = String(it.phone || '').trim();
      const caption = it.caption != null ? String(it.caption) : '';
      const documentBase64 = it.documentBase64;
      let fileName = it.fileName ? String(it.fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') : 'adjunto.pdf';
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }

      if (!phone) {
        results.push({ success: false, error: 'Sin teléfono' });
        continue;
      }

      try {
        let r;
        let data;
        if (documentBase64 && String(documentBase64).length > 0) {
          r = await fetchWithTimeout(`${base}/send-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              caption,
              fileName,
              document: { buffer: documentBase64 },
              mimetype: it.mimetype || 'application/pdf',
            }),
          });
        } else {
          r = await fetchWithTimeout(`${base}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, text: caption }),
          });
        }
        data = await r.json().catch(() => ({}));
        const success = r.ok && data.ok === true;
        results.push({
          success,
          error: success ? undefined : data.error || r.statusText || 'Error desconocido',
        });
      } catch (e) {
        results.push({ success: false, error: e.message || 'Fallo de red' });
      }
    }

    const ok = results.filter((x) => x.success).length;
    res.json({ ok, total: results.length, results });
  }),
);

module.exports = router;
