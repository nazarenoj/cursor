# Revisión de Auditoría y Permisos

## Resumen de la revisión realizada

Se revisaron todas las rutas del backend para verificar que tengan:
1. **Auditoría**: registro de acciones modificadoras (POST, PUT, PATCH, DELETE)
2. **Permisos**: control de acceso según rol del usuario

---

## Correcciones aplicadas

### Permisos

| Ruta | Problema | Solución |
|------|----------|----------|
| `GET /api/usuarios` | No tenía `requirePermission` | Agregado `requirePermission('usuarios.ver')` |
| `DELETE /api/usuarios/:id` | No tenía `requirePermission` | Agregado `requirePermission('usuarios.eliminar')` |

### Auditoría

| Ruta | Problema | Solución |
|------|----------|----------|
| `PUT /api/club-config` | No se auditaba la modificación de configuración del club | Agregado `registrarAuditoria` al middleware de la ruta |
| `POST /api/auth/login` | No se auditaban los intentos de login | Agregado `registrarAuditoria` a la ruta de login |

---

## Estado actual por módulo

### ✅ Con auditoría y permisos correctos

- **Socios**: `router.use(registrarAuditoria)`, permisos en todas las rutas
- **Categorías**: auditoría y permisos
- **Liquidaciones**: auditoría y permisos
- **Usuarios**: auditoría y permisos (corregido GET y DELETE)
- **Permisos**: auditoría y permisos
- **Cajas**: auditoría y permisos
- **Medios de Pago**: auditoría y permisos
- **Localidades**: auditoría y permisos (usa socios.ver/crear)
- **Plantillas WhatsApp**: auditoría y permisos
- **Backup**: auditoría y permisos
- **Club Config**: auditoría agregada al PUT

### ⚠️ Excepciones intencionales

- **Auditoría (módulo)**: Las rutas de auditoría NO usan `registrarAuditoria` para evitar recursión infinita (debeRegistrar excluye `/auditoria`).
- **Preferencias**: No requieren permisos especiales (cada usuario gestiona sus propias preferencias de columnas). No se auditan por ser de bajo impacto.
- **Auth (login)**: Se agregó `registrarAuditoria` a POST `/auth/login`. Los intentos de login (exitosos y fallidos) se registran. Como el usuario aún no está autenticado, se registra como "No autenticado" en el campo usuario, pero la descripción incluye el nombre de usuario intentado (ej: "Iniciar sesión: admin").

---

## Permisos definidos en BD (db.js)

Los siguientes permisos están disponibles:

- `usuarios.ver`, `usuarios.crear`, `usuarios.modificar`, `usuarios.eliminar`, `usuarios.permisos`
- `socios.ver`, `socios.crear`, `socios.modificar`, `socios.eliminar`
- `categorias.ver`, `categorias.crear`, `categorias.modificar`, `categorias.eliminar`
- `liquidaciones.ver`, `liquidaciones.crear`, `liquidaciones.crear_anuales`, `liquidaciones.eliminar`
- `pagos.ver`, `pagos.registrar`, `pagos.anular`, `pagos.exportar`
- `cajas.ver`, `cajas.crear`, `cajas.modificar`, `cajas.cerrar`, `cajas.movimientos`
- `medios_pago.ver`, `medios_pago.crear`, `medios_pago.modificar`, `medios_pago.eliminar`
- `backup.ver`, `backup.ejecutar`, `backup.configurar`, `backup.restaurar`
- `auditoria.ver`
- `club.configurar`
- `whatsapp_templates.ver`, `whatsapp_templates.crear`, `whatsapp_templates.modificar`, `whatsapp_templates.eliminar`

---

## Recomendaciones futuras

1. **backup.eliminar**: Crear permiso específico para eliminar backups (actualmente usa `backup.ejecutar`).
2. **auditoria.eliminar**: Crear permiso específico para eliminar registros de auditoría (actualmente usa `auditoria.ver`).
3. **Login en auditoría**: ✅ Implementado. Los intentos de login se registran en auditoría.
