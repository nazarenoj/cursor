const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Club Social API',
  description: 'API del Club Social Realico',
  script: path.join(__dirname, 'src', 'index.js'),
  nodeOptions: [
    '--max-old-space-size=1024'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

svc.on('install', () => {
  console.log('Servicio instalado correctamente');
  svc.start();
});

svc.on('start', () => {
  console.log('Servicio iniciado');
});

svc.on('error', (err) => {
  console.error('Error en el servicio:', err);
});

// Instalar el servicio
svc.install();

