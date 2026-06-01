# DBF to Excel Converter

Herramienta para convertir archivos DBF (dBase) a formato Excel (XLSX).

## Características

- ✅ Lee archivos DBF de cualquier versión
- ✅ Convierte a formato Excel (.xlsx)
- ✅ Preserva todos los datos y tipos
- ✅ Permite personalizar el nombre de la hoja
- ✅ Manejo de errores robusto

## Instalación

1. Instala las dependencias:

```bash
npm install
```

## Uso

### Instalación de dependencias

Primero, instala las dependencias del proyecto:

```bash
cd dbf-to-excel
npm install
```

### Desde línea de comandos

Después de compilar el proyecto:

```bash
# Compilar el proyecto
npm run build

# Convertir un archivo DBF (el archivo Excel se creará con el mismo nombre)
node dist/index.js archivo.dbf

# Especificar nombre del archivo de salida
node dist/index.js archivo.dbf salida.xlsx

# Especificar nombre del archivo de salida y nombre de la hoja
node dist/index.js archivo.dbf salida.xlsx "Mi Hoja"
```

O usar el script npm (compila y ejecuta):

```bash
# Convertir un archivo DBF
npm start archivo.dbf

# Especificar nombre del archivo de salida
npm start archivo.dbf salida.xlsx

# Especificar nombre del archivo de salida y nombre de la hoja
npm start archivo.dbf salida.xlsx "Mi Hoja"
```

### Modo desarrollo (sin compilar)

```bash
npm run dev archivo.dbf
```

### Como módulo

```typescript
import { convertDbfToExcel } from './src/index';

await convertDbfToExcel({
  inputFile: 'archivo.dbf',
  outputFile: 'salida.xlsx',
  sheetName: 'Datos'
});
```

## Ejemplos

```bash
# Convertir un archivo DBF
npm start datos.dbf

# Convertir y especificar nombre de salida
npm start datos.dbf resultado.xlsx

# Convertir con nombre de hoja personalizado
npm start datos.dbf resultado.xlsx "Liquidaciones"
```

## Desarrollo

### Compilar TypeScript

```bash
npm run build
```

### Ejecutar en modo desarrollo

```bash
npm run dev archivo.dbf
```

## Estructura del Proyecto

```
dbf-to-excel/
├── src/
│   └── index.ts          # Código principal
├── dist/                 # Código compilado (generado)
├── package.json
├── tsconfig.json
└── README.md
```

## Requisitos

- Node.js 18 o superior
- npm o yarn

## Notas

- El archivo DBF debe existir y ser accesible
- Si no se especifica un archivo de salida, se creará uno con el mismo nombre del archivo DBF pero con extensión .xlsx
- Los valores nulos o vacíos se convertirán en celdas vacías en Excel

