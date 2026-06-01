/**
 * Muestra la URL para acceder a la app desde otra PC en la red
 * y luego arranca backend + frontend (npm run dev).
 */
import os from 'os';
import { spawn } from 'child_process';

const interfaces = os.networkInterfaces();
const ips = [];

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      ips.push(iface.address);
    }
  }
}

const port = 5173;
console.log('');
console.log('========================================');
console.log('  SERVIDOR EN RED LOCAL');
console.log('========================================');
console.log('');
console.log('  En esta PC (localhost):');
console.log('    http://localhost:' + port);
console.log('');
if (ips.length > 0) {
  console.log('  Desde otra PC o celular en la misma red:');
  ips.forEach((ip) => {
    console.log('    http://' + ip + ':' + port);
  });
  console.log('');
  console.log('  El backend (API) estará en el mismo host, puerto 3000.');
} else {
  console.log('  No se detectó IP de red. Verificá la conexión (Wi-Fi/Ethernet).');
}
console.log('');
console.log('  Si no carga desde otra PC: permitir puertos 5173 y 3000 en el firewall.');
console.log('========================================');
console.log('');
console.log('Arrancando backend y frontend...');
console.log('');

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

child.on('error', (err) => {
  console.error('Error al arrancar:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
