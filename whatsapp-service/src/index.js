require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect, setAuthFolder } = require('./baileys');
const routes = require('./routes');
const pkg = require('../package.json');

const PORT = parseInt(process.env.PORT || '4002', 10);
const AUTH_FOLDER = process.env.AUTH_FOLDER || './auth_wa';

setAuthFolder(AUTH_FOLDER);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/', routes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'whatsapp-service' });
});

async function main() {
  await connect();
  app.listen(PORT, () => {
    console.log('WhatsApp Service v' + pkg.version + ' en http://localhost:' + PORT);
    console.log('  GET  /status         Estado y QR (base64)');
    console.log('  POST /send-text      Solo texto');
    console.log('  POST /send-document  PDF u otro documento + caption');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
