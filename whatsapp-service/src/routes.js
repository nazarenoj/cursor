const express = require('express');
const { getStatus, getQRImage } = require('./baileys');
const { enqueue, getQueueLength } = require('./queue');
const pkg = require('../package.json');

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const status = await getStatus();
    const queueLength = getQueueLength();
    res.json({ ...status, queueLength, version: pkg.version });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/qr', async (req, res) => {
  try {
    const buf = await getQRImage();
    if (!buf) {
      return res.status(404).json({ ok: false, error: 'No hay QR disponible. Ya estas conectado?' });
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/send-text', express.json(), async (req, res) => {
  try {
    const { phone, text } = req.body || {};
    if (!phone || text === undefined) {
      return res.status(400).json({ ok: false, error: 'Se requieren phone y text' });
    }
    const result = await enqueue({
      type: 'text',
      phone: String(phone).trim(),
      text: String(text),
    });
    res.status(201).json({
      ok: true,
      id: result?.id,
      queuedAt: new Date().toISOString(),
    });
  } catch (e) {
    const status = e.message?.includes('Cola llena') ? 429 : 500;
    res.status(status).json({ ok: false, error: e.message });
  }
});

router.post('/send-document', express.json(), async (req, res) => {
  try {
    const { phone, caption, document, fileName } = req.body || {};
    if (!phone || !fileName) {
      return res.status(400).json({ ok: false, error: 'Se requieren phone y fileName' });
    }
    if (!document || typeof document !== 'object') {
      return res.status(400).json({ ok: false, error: 'document debe ser un objeto con url, path o buffer' });
    }
    const result = await enqueue({
      type: 'document',
      phone: String(phone).trim(),
      options: {
        caption: caption != null ? String(caption) : undefined,
        document: {
          url: document.url != null ? String(document.url) : undefined,
          path: document.path != null ? String(document.path) : undefined,
          buffer: document.buffer != null ? String(document.buffer) : undefined,
        },
        fileName: String(fileName),
        mimetype: req.body.mimetype || 'application/pdf',
      },
    });
    res.status(201).json({
      ok: true,
      id: result?.id,
      queuedAt: new Date().toISOString(),
    });
  } catch (e) {
    const status = e.message?.includes('Cola llena') ? 429 : 500;
    res.status(status).json({ ok: false, error: e.message });
  }
});

module.exports = router;
