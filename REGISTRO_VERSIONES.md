# Registro de versiones

Formato de versión: **A.B.C**

| Parte | Cuándo incrementar |
|-------|--------------------|
| **A** | Solo cuando hay cambios en la **Base de datos** (migraciones, tablas, columnas, índices). |
| **B** | Cuando hay cambios en **Backend y Frontend** (sin cambios de BD; o en el mismo release que A). |
| **C** | Cuando los cambios son **solo Frontend** (UI, estilos, textos, sin tocar backend ni BD). |

Al subir **A** se resetean B y C a 0.  
Al subir **B** se resetea C a 0.

---

## Historial

### 3.12.0 — 2026-04-01
- **Tipo:** Backend y Frontend
- **Cambios:** Backups compartibles entre Linux y Windows: configuración `formatoBackup` (`auto` | `zip_portable`) para forzar ZIP sin WinRAR; endpoint `GET /api/backup/descargar/:nombre` con validación de ruta; UI en configuración y botón Descargar en listado de backups. Refactor de resolución de ruta de archivo para restaurar/eliminar/descargar (`resolverRutaArchivoBackup`). Documentación en `GUIA_BACKUP_API.md`.

### 3.11.0 — 2026-04-01
- **Tipo:** Backend y Frontend
- **Cambios:** Backups sin WinRAR en hosting Linux (Hostinger): compresión y extracción `.zip` con `archiver` y `unzipper` en Node cuando no hay WinRAR ni `unzip` del sistema; orden de métodos WinRAR → Node ZIP → tar/zip/PowerShell. API `/backup/config` expone `servidorWindows`; la UI de configuración de backup muestra WinRAR solo si el servidor es Windows y aclara ZIP vía Node. Documentación en `GUIA_BACKUP_API.md`.

### 3.10.0 — 2026-03-31
- **Tipo:** Backend y Frontend
- **Cambios:** Se creó framework de pruebas automatizadas en backend con `node:test` (`npm test`) y tests para la distribución de pagos por medios; además se extrajo la lógica a `pagosDistribucion` para validar que ninguna cuota reciba más que su monto.

### 3.9.0 — 2026-03-31
- **Tipo:** Backend y Frontend
- **Cambios:** Registro de pagos múltiples: la distribución por medios ahora se hace sobre el saldo de cada cuota (proporcional y con ajuste por centavos), evitando que una cuota reciba un importe mayor a su monto.

### 3.8.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Backups: listado robusto ante carrera de archivos temporales (`temp_validate`/`temp_restore`) evitando `ENOENT` al hacer `stat`; nuevo endpoint de directorios existentes y selector en Configuración de Backup para elegir carpeta sin escribir ruta manual.

### 3.7.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Backups: ruta de carpeta resuelta a absoluta (`path.resolve` si es relativa), creación con `mkdir` antes de listar/limpiar/restaurar/eliminar; evita `ENOENT` cuando la carpeta configurada (ej. `backups1`) aún no existía.

### 3.6.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Backups multiplataforma: si no hay WinRAR se usa `tar` (archivo `.zip`), `zip` en Linux o PowerShell en Windows; restauración y validación con `unzip`/PowerShell para `.zip`; listado, retención y rutas `mysqldump` en Linux (`/usr/bin/...`); derivación correcta de `mysql` desde `mysqldump` en Unix. Configuración de backup muestra el método de compresión detectado.

### 3.5.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Versión unificada `appVersion`: el backend la expone en `/api/health`, `/api/club-config` (público y autenticado), estado WhatsApp Baileys; se genera `dist/app-version.json` en el build (Vite) para producción. El login y el layout muestran la versión devuelta por la API cuando existe (fallback al valor empaquetado del frontend).

### 3.4.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** `initDb`: crear y sembrar `club_config` justo después de `getPool()` para evitar la carrera en Hostinger donde `/api/club-config/public` se atiende antes de que exista la tabla (`Table ... club_config doesn't exist`).

### 3.3.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Conexión MySQL: no forzar `localhost`/`::1` a `127.0.0.1` (evita `Access denied ... @'127.0.0.1'` en Hostinger cuando el usuario está creado para `localhost`/hostname remoto); nota en despliegue sobre `DB_HOST`.

### 3.2.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** WhatsApp Baileys embebido en el mismo proceso que la API (`WHATSAPP_EMBEDDED`): carpeta `server/src/whatsappEmbedded`, dependencias en `server`, arranque en `index.js` y modo dual en `whatsappBaileys` (embebido vs microservicio remoto). Documentación Hostinger y `env.sample` actualizados; `server/whatsapp_auth/` ignorado en git.

### 3.1.4 — 2026-03-30
- **Tipo:** Solo Frontend
- **Cambios:** En `production` el frontend resuelve la API y URLs de logos desde `window.location` (sin depender de `VITE_API_URL` por instancia) para deploy multi-instancia; además se actualizó la documentación y se agregó un script opcional para empaquetar.

### 3.1.3 — 2026-03-30
- **Tipo:** Solo Frontend
- **Cambios:** Envío masivo (`EnvioMasivoSocios`) y modal WhatsApp en lista de socios usan `whatsappUsarServicio` de configuración del club (sin `localStorage`); `WhatsAppServicioEstadoUI` + `WhatsAppServicioQrEnModal` para estado y QR al no estar conectado.

### 3.1.2 — 2026-03-30
- **Tipo:** Solo Frontend
- **Cambios:** WhatsApp: Baileys por defecto (`readUseBaileysFromStorage` salvo `localStorage` explícito `'0'`); textos de UI aclarando que `wa.me` es solo al desmarcar; modal de Lista Socios con envío vía API Baileys y PDF opcional.

### 3.1.1 — 2026-03-30
- **Tipo:** Solo Frontend
- **Cambios:** Envío masivo desde lista de socios (`EnvioMasivoSocios`) con el mismo modo servicio Baileys (texto + PDF opcional compartido), sincronizado con `EnviarWhatsApp` vía `whatsappEnvio.ts`; lotes de hasta 80 destinatarios por llamada a la API.

### 3.1.0 — 2026-03-30
- **Tipo:** Backend y Frontend
- **Cambios:** Integración de envío WhatsApp por microservicio Baileys (texto + PDF): carpeta `whatsapp-service`, proxy autenticado `/api/whatsapp-baileys` (estado y envío por lote), PDF por cuota generado en cliente (`liquidacionCuotasToPdfBase64`), UI en EnviarWhatsApp con modo servicio, QR y variable de entorno `WHATSAPP_SERVICE_URL`.

### 3.0.3 — 2026-03-20
- **Tipo:** Solo Frontend
- **Cambios:** Se eliminó el pestañeo restante al ingresar en rutas protegidas esperando la carga de configuración del club en `PrivateRoute`, y se consolidó la caché de configuración para mantener color/logo consistentes desde el primer render.

### 3.0.2 — 2026-03-20
- **Tipo:** Solo Frontend
- **Cambios:** Se corrigió el login para resolver correctamente el logo con `VITE_API_URL` y se eliminó el pestañeo de colores al ingresar reutilizando caché de configuración del club como estado inicial.

### 3.0.1 — 2026-03-20
- **Tipo:** Solo Frontend
- **Cambios:** El login ya no muestra valores por defecto al iniciar: ahora espera a cargar `club-config/public` y recién renderiza la pantalla con datos reales del club. Si falla la carga, muestra estado de error con botón de reintento.

### 3.0.0 — 2026-03-20
- **Tipo:** Base de datos
- **Cambios:** Se agregó zona horaria configurable en `club_config` (columna `timezone`) con soporte en API y pantalla de configuración del club. La app ahora aplica esa zona horaria para mostrar fechas/horas de forma consistente para todos los usuarios.

### 2.2.3 — 2026-03-20
- **Tipo:** Solo Frontend
- **Cambios:** Estabilizar parseo/comparación y formateo de fechas/hora MySQL reemplazando `new Date('YYYY-MM-DD')` y `date-fns format(new Date(...))` por utilidades (`clubDateTime`) para evitar corrimientos por zona horaria en listados, impresiones y exportaciones PDF.

### 2.2.2 — 2026-03-19
- **Tipo:** Solo Frontend
- **Cambios:** Fix de errores de compilación para build de producción (variables no usadas TS6133, render de `unknown` en auditoría, casteo de filtros en exportación) y consistencia menor de UI.

### 2.2.1 — 2026-03-17
- **Tipo:** Solo Frontend
- **Cambios:** Mejoras de frontend: Error Boundary global y en gráficos (ListaLiquidaciones, ListadoPagos); code splitting para PDF/Excel (import dinámico de jspdf, xlsx y utils en handlers de exportar); tipado estricto (eliminación de any en api.ts, tipos index, ResumenCaja, ImprimirTesoreria, ListaAuditoria, ConfiguracionBackup); responsividad (overflow-x: auto en tablas a 768px, botones de acción min 44px en TablaSocios y TablaLiquidaciones); TanStack Query en Socios (useQuery + useMutation e invalidateQueries); token JWT en memoria en lugar de localStorage para reducir riesgo XSS.

### 2.2.0 — 2026-03-17
- **Tipo:** Backend y Frontend
- **Cambios:** Optimización de la API: paginación en GET /api/socios (page, limit, meta total/pages/currentPage); compresión Gzip (compression) en index.js; caché en memoria (node-cache) para categorías (60 min, invalidación en POST/PUT/DELETE); script SQL server/scripts/indices-mysql.sql para índices en socios, adherentes, liquidaciones_cuotas, usuarios, cajas, movimientos_cajas; reemplazo de SELECT * por columnas explícitas en rutas (socios, usuarios, liquidaciones, cajas, permisos). Frontend: ListaSocios usa loadSocios con paginación, total desde meta, controles Anterior/Siguiente.

### 2.1.0 — 2026-03-17
- **Tipo:** Backend y Frontend
- **Cambios:** Validación de body con Zod en creación y actualización de socios: nuevo middleware validators.js (socioCreateSchema, socioUpdateSchema, adherentes); POST y PUT usan validate(schema); eliminadas validaciones manuales redundantes; conversión de tipos y trim centralizados en el esquema.

### 2.0.0 — 2026-03-17
- **Tipo:** Base de datos
- **Cambios:** Auditoría API: Helmet y CORS estricto en producción; middleware de errores sin details en producción; columna es_superadmin en usuarios (permisos por flag en lugar de hardcoding); initDb no actualiza password del usuario oculto; /auth/me con authenticateToken; fs.promises y número de socio dentro de transacción en socios; prestart y script vaciar-todo-db eliminados; vaciar-todo-db bloqueado en producción.

### 1.1.7 — 2026-03-17
- **Tipo:** Solo Frontend
- **Cambios:** Cuando el envío de mensajes viene de la lista de socios (socio fijo, tipo liquidaciones), se envía un solo mensaje por socio con todas sus cuotas (variable {detalleCuotas} y total en {monto}). Plantilla por defecto de liquidaciones actualizada para usar {detalleCuotas}.

### 1.1.6 — 2026-03-17
- **Tipo:** Solo Frontend
- **Cambios:** En pantalla de envío de mensajes se eliminaron los filtros "Mín. cuotas impagas" y "Máx. cuotas por socio"; queda solo el checkbox "Solo cuotas pendientes".

### 1.1.5 — 2026-03-17
- **Tipo:** Solo Frontend
- **Cambios:** La acción "Enviar liquidaciones por WhatsApp" en la lista de socios ahora abre la pantalla completa de mensajes con el socio fijo y tipo "liquidaciones". Se compactó el layout de EnviarWhatsApp (menos espaciado, botones más chicos, tabla más alta) y se eliminó el bloque de "Variables disponibles".

### 1.1.4 — 2026-03-17

- **Tipo:** Solo Frontend
- **Cambios:** Lista de socios: se reemplaza el modal de envío masivo por la pantalla completa EnviarWhatsApp con socios fijos (un único destinatario o conjunto fijo, sin checkboxes ni seleccionar/deseleccionar); nueva prop sociosFijos en EnviarWhatsApp; se elimina el bloque de ejemplo de variables en la pantalla de mensajes; un solo botón "Mensajes a socios" que abre dicha pantalla.

### 1.1.3 — 2026-03-17

- **Tipo:** Solo Frontend
- **Cambios:** Unificación de plantillas con tipos de mensaje: un solo selector "Tipo de mensaje o plantilla" en EnviarWhatsApp y en el modal EnvioMasivoSocios (tipos + separador + plantillas guardadas); botón "Mensajes (pantalla completa)" en Lista de socios abre EnviarWhatsApp con socios preseleccionados (opción A); se mantiene el modal "Envío rápido" para envío rápido desde socios.

### 1.1.2 — 2026-03-17

- **Tipo:** Solo Frontend
- **Cambios:** Modal de envío masivo desde lista de socios: selector "Tipo de mensaje" con plantillas Genérico, Cumpleaños, Al día y Datos faltantes; variable {datosFaltantes} y texto por defecto según tipo; vista previa y envío usan la plantilla elegida.

### 1.1.1 — 2026-03-17

- **Tipo:** Solo Frontend
- **Cambios:** Enviar mensajes a socios: selector de tipo (Liquidaciones, Cumpleaños, Al día, Datos faltantes, Genérico); filtros en liquidaciones (mín. cuotas impagas, máx. cuotas por socio); orden más reciente primero documentado; plantillas y envío individual/masivo reutilizados con variables por tipo; título y botones actualizados.

### 1.1.0 — 2026-03-05

- **Tipo:** Backend y Frontend
- **Cambios:** Cajas: permitir desactivar una caja que tiene movimientos/saldo; el backend solo impide modificar el *saldo inicial* cuando ya hay movimientos, pero permite actualizar nombre, descripción y estado activa; en el formulario se añade nota indicando que se puede desactivar la caja para que no se use en nuevos cobros.

### 1.0.15 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** PDF del recibo: medios de pago se muestran sumarizados (un total por medio), sin desglose por liquidación; `reciboPdf` acepta opcionalmente `mediosDetalle` y suma por medio; RegistrarPagos pasa `mediosDetalle` para que el PDF siempre muestre el resumen.

### 1.0.14 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Listado de cobros: columna Acciones con botón "Reimprimir recibo" que genera el PDF del recibo (todas las cuotas del mismo número de recibo); util compartido `utils/reciboPdf.ts` para generar el PDF; RegistrarPagos pasa a usar el mismo util.

### 1.0.13 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Listado de socios: misma disposición que liquidaciones y cobros; primera fila solo filtros (alineados a la derecha); segunda fila selector Filtros visibles, Columnas, Envío masivo, Agregar Socio, Exportar PDF/Excel; filtros movidos dentro del contenedor de la tabla.

### 1.0.12 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Listado de Cobros Registrados: selector de filtros visibles (misma lógica que columnas, persistido); primera fila solo filtros + Limpiar; segunda fila Columnas, Filtros, Exportar PDF/Excel, Ver gráfico; gráfico de barras "Cobrado por mes"; clic en gráficos abre modal ampliado; layout y estilos alineados con Liquidaciones.

### 1.0.11 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Filtro liquidación desde/hasta pasa a ser por mes de la liquidación (no por fecha de creación); inputs tipo month; gráfico de barras con altura similar al de tortas (~200px); clic en gráficos abre modal con el gráfico en tamaño mayor; cierre con Escape o clic fuera.

### 1.0.10 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Liquidaciones: filtros alineados a la derecha; en categorías agregados "Seleccionar todo" y "Deseleccionar todo"; filtro liquidación desde/hasta (fecha); gráfico de torta y resumen con datos filtrados; nuevo gráfico de barras comparativo Cobrado vs Liquidado por liquidación mensual.

### 1.0.9 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Gestión de Liquidaciones Mensuales: primera fila solo filtros (categoría, socio, año, Limpiar); segunda fila selector Columnas visibles, selector Filtros visibles (misma lógica que columnas, persistido en localStorage), botones de acción; SelectorColumnas admite labelBoton para reutilizarlo como "Filtros".

### 1.0.8 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Gestión de Liquidaciones Mensuales: filtros por categoría (múltiple), socio por nombre o número (texto), año; barra de filtros al lado del selector de columnas; botón Limpiar filtros.

### 1.0.7 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Formulario liquidaciones por socios: se puede agregar cualquier mes/año con selector tipo calendario (input month); se evita duplicar liquidaciones para el mismo socio y mes; columnas de la tabla son los meses que aparecen en la selección.

### 1.0.6 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Formulario liquidaciones por socios: cuotas a generar se muestran en tabla; cada mes incluido es un botón y al hacer clic se quita de los meses a incluir.

### 1.0.5 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Formulario de alta/modificación de socios con scroll vertical habilitado en su contenedor para evitar contenido cortado y permitir recorrer todo el formulario.

### 2.0.18 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Optimización del build con carga diferida por rutas y componentes en `App`/`Liquidaciones`; exportaciones de PDF y Excel ahora se cargan bajo demanda para reducir el bundle inicial y mejorar tiempos de carga.

### 2.0.17 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Lista de socios: layout flex para evitar doble scroll; tabla con altura adecuada (min/max reducidos 3 filas). Selector múltiple de categorías reemplazado por dropdown con checkboxes (sin Ctrl+clic).

### 2.0.16 — 2026-03-05

- **Tipo:** Solo Frontend
- **Cambios:** Contenedores de páginas y listas limitados al viewport: layout con height/max-height 100vh y overflow hidden; scroll dentro del área de contenido principal.

### 2.0.15 — 2026-03-05

- **Tipo:** Backend y Frontend
- **Cambios:** Ejemplo de variables {mes} y {monto} en WhatsApp; backups con fecha y hora en el nombre; filtro múltiple de categorías en socios; ancho flexible de tablas; selector de filtros visibles (LiquidacionesSocio, FiltrosSocios); envío masivo WhatsApp/email a socios seleccionados con plantillas; liquidaciones ordenadas por más recientes y envío de todas las pendientes.

### 2.0.14 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Menú lateral: submenús (Secretaría, Tesorería, Seguridad) ocultos por defecto; se muestran al hacer clic en el título del grupo. Se expande automáticamente el grupo de la ruta actual.

### 2.0.13 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Listado de cobros: botones (Limpiar filtros, Exportar PDF, Exportar Excel, Ver gráfico) en la misma línea que el selector de columnas.

### 2.0.12 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Botones y selector de columnas fijos al hacer scroll: tabla-acciones-superior fuera del wrapper con scroll en ListadoPagos, TablaSocios, ListaAuditoria, ListaUsuarios, TablaCategorias, TablaLiquidacionesMensuales. Actualizada regla tablas-listados.mdc.

### 2.0.11 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Botón Exportar PDF de liquidaciones exporta directamente sin mostrar ventana previa.

### 2.0.10 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Exportaciones a PDF respetan columnas visibles y filtros: ListadoPagos, Socios, Categorías, Tesorería e ImprimirSocios/ImprimirCategorias/ImprimirTesoreria solo incluyen columnas seleccionadas.

### 2.0.9 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Exportaciones a Excel respetan columnas ocultas: Auditoría solo exporta columnas visibles; el resto ya lo hacía.

### 2.0.8 — 2026-03-01

- **Tipo:** Backend y Frontend.
- **Cambios:** PDF del recibo al cobrar: corregir envío de numeroRecibo desde el servidor (objeto en lugar de array) para que figure el Nº de Recibo en el PDF.

### 2.0.7 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Liquidaciones del socio: contenedor interno con padding-bottom 6rem para que la última fila se vea completa al hacer scroll.

### 2.0.6 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Liquidaciones del socio: padding-bottom en la tabla para que la última fila se vea completa al hacer scroll.

### 2.0.5 — 2026-03-01

- **Tipo:** Backend.
- **Cambios:** Auditoría y permisos: requirePermission en GET/DELETE usuarios; auditoría en PUT club-config y POST login.

### 2.0.4 — 2026-03-01

- **Tipo:** Backend y Frontend.
- **Cambios:** Al cambiar número de socio se actualiza en liquidaciones_cuotas. Excel doble entrada: gris en celdas vacías, verde en monto 0 (pagado). Permitir eliminar auditoría sin filtros (descarga Excel previo).

### 2.0.3 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Regla unificada para listas: selector de columnas, ordenamiento por clic en encabezado y filtros por columnas aplicados en ListaCajas, TesoreriaMovimientos, TablaLiquidaciones, ListaCategorias, ListaUsuarios, ListaMediosPago y LiquidacionesSocio. Actualizada regla tablas-listados.mdc.

### 2.0.2 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Ver liquidaciones de socio: columna Nº Recibo en la tabla; cuadro resumen de totales con la misma combinación de color y sombra que los otros cuadros.

### 2.0.1 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Nº Recibo visible en Listado de cobros (tabla, PDF y Excel) y en el PDF del recibo al registrar un cobro.

### 2.0.0 — 2026-03-01

- **Tipo:** Base de datos.
- **Cambios:** Cada cobro registrado recibe un número de recibo correlativo; tabla secuencia_recibos y columna numero_recibo en liquidaciones_cuotas; el PDF del recibo muestra el número y el archivo se nombra con el número.

### 1.0.11 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Resumen de cobros: filtro por socio cambiado de dropdown a búsqueda por texto (número, apellido o nombre).

### 1.0.10 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Ordenamiento por clic en encabezados de columna en Resumen de cobros (Tesoreria) y en Movimientos de caja (TesoreriaMovimientos).

### 1.0.9 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Tesorería (resumen cobro por medio de pago): filtros por socio, categoría y mes liquidado; cuadros de totales reducidos ~75% en todas las ventanas (Tesoreria, TablaLiquidaciones, LiquidacionesSocio, RegistrarPagos, ListaLiquidaciones, ImprimirTesoreria, ImprimirLiquidaciones, ResumenCaja, ListadoPagos).

### 1.0.8 — 2026-03-01

- **Tipo:** Backend y Frontend.
- **Cambios:** Registrar cobros: al pagar varias liquidaciones juntas se guarda en cada cuota su monto proporcional en medio_pago (no el total) y se crea un movimiento de caja por cuota con ese monto; layout de la página Registrar cobro: la columna de medios de pago alarga para igualar la altura de la columna de cuotas pendientes.

### 1.0.7 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Tesorería (cobros por medio de pago): el total general ahora coincide con el medio seleccionado en el filtro (o con la suma de todos si no hay filtro) y el combo de medio de pago se alimenta de los medios configurados en el sistema en lugar de una lista fija.

### 1.0.6 — 2026-03-01

- **Tipo:** Solo Frontend.
- **Cambios:** Tesorería dividida en dos submenús: cobros por medio de pago y nuevo listado de movimientos de caja con filtros por caja, fecha y tipo, usando la estructura de tablas estándar.

### 1.0.4 — 2026-01-28

- **Tipo:** Solo Frontend.
- **Cambios:** Scroll en tablas: Listado de cobros registrados y Tesorería (detalle por medio de pago). Misma estructura que listado de socios (contenedor con overflow hidden + wrapper con max-height y overflow auto). Barras de scroll visibles.

### 1.0.3 — 2026-01-28

- **Tipo:** Solo Frontend.
- **Cambios:** Corregido filtro por estado en Gestión de socios: al elegir "Inactivos" ya no se mostraban todos; el valor `activo: false` se conservaba como `undefined` por usar `value || undefined`.

### 1.0.2 — 2026-01-28

- **Tipo:** Solo Frontend.
- **Cambios:** Filtro de búsqueda en Gestión de socios con formato, ubicación y sentido igual al de Listado de cobros: barra siempre visible, misma rejilla y estilos, dentro de card sobre la tabla.

### 1.0.1 — 2026-01-28

- **Tipo:** Solo Frontend.
- **Cambios:** Gestión de socios: filtro de búsqueda fijo (sticky) en la parte superior de la tabla; eliminados filtros por provincia y localidad. Verificado scroll en listado de cobros registrados (ya estaba configurado).

### 1.0.0 — 2026-01-28

- **Tipo:** Inicio del versionado.
- **Cambios:** Se incorpora el número de versión en el menú (bajo el nombre de usuario) y este registro interno.
- **A:** 1 — Sin cambios de BD en este release; versión base.
- **B:** 0 — Sin cambios backend en este release.
- **C:** 0 — Cambio solo frontend (muestra de versión + archivo de registro).

---

*Las nuevas versiones se registran automáticamente al hacer cambios en el proyecto (regla en `.cursor/rules/versionado-automatico.mdc`).*
