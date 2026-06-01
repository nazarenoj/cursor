/**
 * Archivo de entrada para Hostinger (solo tienen "archivo de entrada").
 * En Hostinger: configurar "Archivo de entrada" = start.js
 * Dependencias: si el panel ejecuta npm install en el deploy, no hace falta subir node_modules en el ZIP.
 * Si tu hosting no instala paquetes, generá el ZIP con node_modules (ver scripts/deploy-hostinger.ps1 -BundleNodeModules).
 */
require('./src/index.js');
