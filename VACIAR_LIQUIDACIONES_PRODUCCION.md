# Cómo vaciar liquidaciones y movimientos de caja en producción

Este documento explica cómo ejecutar el script que **vacía liquidaciones, pagos y todos los movimientos de caja**, y pone las cajas a saldo 0, **manteniendo usuarios y socios**.

## Qué hace el script

- **Borra:** todos los movimientos de caja, todas las cuotas de liquidación, todas las liquidaciones mensuales.
- **Actualiza:** saldo inicial de todas las cajas a 0.
- **No toca:** socios, usuarios, categorías, definición de cajas, medios de pago, adherentes, configuración del club, etc.

---

## Opción A: Script Node.js (recomendado en producción)

Usa la configuración de base de datos del proyecto (`server/.env`). No necesitás tener MySQL en el PATH.

### 1. Hacer backup de la base de datos

**Antes de cualquier cambio**, hacer un backup completo. En el servidor de producción:

- Si tenés panel de Hostinger / phpMyAdmin: usar la opción de exportar/backup de la base de datos.
- Si tenés acceso por consola y `mysqldump`:
  ```bash
  mysqldump -u USUARIO -p NOMBRE_BD > backup-antes-vaciar-YYYYMMDD.sql
  ```

### 2. Subir o tener el proyecto en el servidor

Asegurate de tener en el servidor:

- La carpeta `server/` con `scripts/vaciar-liquidaciones-y-pagos.js`
- El archivo `server/.env` con las variables de BD de **producción** (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)

### 3. Ejecutar el script

En el servidor, desde la **raíz del proyecto**:

```bash
npm run vaciar-liquidaciones --prefix server
```

O entrando a la carpeta del backend:

```bash
cd server
node scripts/vaciar-liquidaciones-y-pagos.js
```

El script mostrará qué va a borrar y pedirá que escribas **BORRAR** para confirmar.

Para ejecutar **sin preguntar** (por ejemplo desde otro script o cron):

```bash
cd server
node scripts/vaciar-liquidaciones-y-pagos.js --yes
```

### 4. Verificar

- En la app: no deberían aparecer liquidaciones ni movimientos de caja; las cajas deberían verse en 0.
- Socios y usuarios siguen igual.

---

## Opción B: Script PowerShell + SQL (servidor Windows con MySQL instalado)

Si en producción tenés Windows y MySQL instalado (por ejemplo en `C:\Program Files\MySQL\...`):

1. **Backup:** exportar la base desde MySQL Workbench, phpMyAdmin o:
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p club_social > C:\backups\backup-antes-vaciar.sql
   ```

2. Copiar a la carpeta del proyecto en el servidor los archivos:
   - `borrar-liquidaciones-y-cobros.ps1`
   - `borrar-liquidaciones-y-cobros.sql`

3. Ajustar en el `.ps1` si hace falta:
   - `$mysqlBin` (ruta de MySQL)
   - `$dbName` (nombre de la base)

4. Ejecutar en PowerShell:
   ```powershell
   .\borrar-liquidaciones-y-cobros.ps1
   ```
   El script pide confirmar que hiciste backup (escribir **SI**) y luego que escribas **BORRAR** para ejecutar.

---

## Resumen rápido (producción)

| Paso | Acción |
|------|--------|
| 1 | Backup de la base de datos |
| 2 | En el servidor: `npm run vaciar-liquidaciones --prefix server` (o `cd server && node scripts/vaciar-liquidaciones-y-pagos.js`) |
| 3 | Escribir **BORRAR** cuando lo pida |
| 4 | Comprobar en la app que no hay liquidaciones ni movimientos y que las cajas están en 0 |

Si algo falla, el script Node hace **rollback**: no se aplica ningún cambio.
