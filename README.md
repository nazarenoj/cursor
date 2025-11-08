# Sistema de Gestión de Socios - Club Social y Deportivo

Aplicación web completa para la gestión de socios de un club social y deportivo, desarrollada con React, TypeScript y Vite.

## 🚀 Características

### Gestión de Socios
- ✅ **Agregar** nuevos socios con todos sus datos
- ✅ **Modificar** información de socios existentes
- ✅ **Borrar** socios del sistema
- ✅ **Listar** socios con múltiples filtros
- ✅ **Imprimir** listados de socios con filtros aplicados

### Gestión de Categorías
- ✅ **Agregar** nuevas categorías de socio
- ✅ **Modificar** categorías existentes
- ✅ **Borrar** categorías
- ✅ **Listar** todas las categorías
- ✅ **Imprimir** listado de categorías

### Datos de Socios
La aplicación permite gestionar los siguientes datos de cada socio:
- Número de socio
- Apellido y Nombre
- DNI (Documento Nacional de Identidad Argentino)
- Fecha de nacimiento
- Dirección completa (Calle, Número, Localidad, Provincia)
- Teléfono (formato WhatsApp)
- Email
- Categoría de socio
- Obra social y número de afiliado
- Fecha de alta y fecha de baja

### Filtros de Búsqueda
- Por número de socio
- Por apellido
- Por nombre
- Por DNI
- Por categoría
- Por estado (Activo/Inactivo)
- Por provincia
- Por localidad

## 📋 Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- npm o yarn

## 🔧 Instalación

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

3. **Abre tu navegador:**
   La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
.
├── src/
│   ├── components/          # Componentes React
│   │   ├── FormularioSocio.tsx
│   │   ├── FormularioCategoria.tsx
│   │   ├── ListaSocios.tsx
│   │   ├── ListaCategorias.tsx
│   │   ├── TablaSocios.tsx
│   │   ├── TablaCategorias.tsx
│   │   ├── FiltrosSocios.tsx
│   │   ├── ImprimirSocios.tsx
│   │   ├── ImprimirCategorias.tsx
│   │   └── Layout.tsx
│   ├── pages/              # Páginas de la aplicación
│   │   ├── SociosPage.tsx
│   │   └── CategoriasPage.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useSocios.ts
│   │   └── useCategorias.ts
│   ├── services/           # Servicios
│   │   └── storage.ts
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Ejecuta el linter para verificar el código

## 💾 Almacenamiento de Datos

Por defecto, la aplicación utiliza **localStorage** del navegador para almacenar los datos. Esto significa que:
- Los datos se guardan localmente en tu navegador
- Los datos persisten entre sesiones
- Cada navegador tiene su propia base de datos

**Nota:** Para producción, se recomienda reemplazar el servicio de almacenamiento por llamadas a una API backend.

## 📖 Uso de la Aplicación

### Gestión de Socios

1. **Agregar un nuevo socio:**
   - Navega a la sección "Socios"
   - Haz clic en "Agregar Socio"
   - Completa el formulario con los datos del socio
   - Haz clic en "Agregar"

2. **Modificar un socio:**
   - En la lista de socios, haz clic en el botón ✏️ (Modificar)
   - Edita los campos necesarios
   - Haz clic en "Modificar"

3. **Borrar un socio:**
   - En la lista de socios, haz clic en el botón 🗑️ (Borrar)
   - Confirma la eliminación

4. **Filtrar socios:**
   - Haz clic en "Filtros de Búsqueda" para expandir los filtros
   - Ingresa los criterios de búsqueda
   - Los resultados se actualizan automáticamente

5. **Imprimir listado:**
   - Aplica los filtros deseados (opcional)
   - Haz clic en "Imprimir"
   - Se mostrará una vista optimizada para impresión
   - Usa el botón "Imprimir" o Ctrl+P para imprimir

### Gestión de Categorías

1. **Agregar una categoría:**
   - Navega a la sección "Categorías"
   - Haz clic en "Agregar Categoría"
   - Ingresa el nombre de la categoría
   - Haz clic en "Agregar"

2. **Modificar/Borrar categorías:**
   - Similar al proceso de socios

## 🎨 Características Técnicas

- **React 18** - Biblioteca de JavaScript para construir interfaces
- **TypeScript** - Tipado estático para mayor seguridad
- **Vite** - Herramienta de construcción rápida
- **React Router** - Navegación entre páginas
- **date-fns** - Manejo de fechas
- **localStorage** - Almacenamiento local de datos

## 🔄 Regla General de CRUD

Todas las tablas del sistema implementan las siguientes funciones:
- ✅ **Agregar** - Crear nuevos registros
- ✅ **Modificar** - Actualizar registros existentes
- ✅ **Borrar** - Eliminar registros
- ✅ **Listar** - Mostrar registros con filtros
- ✅ **Imprimir** - Generar reportes imprimibles

## 📝 Notas Importantes

- El formato de teléfono se ajusta automáticamente para WhatsApp (ej: +54 9 11 1234-5678)
- Las fechas se muestran en formato DD/MM/YYYY
- Los socios inactivos (con fecha de baja) se muestran con un indicador visual
- Los filtros se pueden combinar para búsquedas más específicas
- La vista de impresión está optimizada para papel

## 🚀 Próximos Pasos Sugeridos

1. **Backend API:** Conectar con un servidor backend para almacenamiento persistente
2. **Autenticación:** Agregar sistema de usuarios y permisos
3. **Exportación:** Agregar exportación a Excel/PDF
4. **Búsqueda avanzada:** Implementar búsqueda por múltiples criterios simultáneos
5. **Historial:** Registrar cambios y modificaciones
6. **Reportes:** Generar reportes estadísticos

## 🤝 Contribuir

¡Siéntete libre de modificar y extender esta aplicación según tus necesidades!

---

**Desarrollado con ❤️ para la gestión eficiente de clubes sociales y deportivos**
