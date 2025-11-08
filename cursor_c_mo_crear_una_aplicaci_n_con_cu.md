# Cómo crear una aplicación con cursor
_Exported on 11/6/2025 at 21:20:30 GMT-3 from Cursor (2.0.64)_

---

**User**

como creo una aplicacion desde cero con cursor

---

**Cursor**


Creando una aplicación web moderna desde cero. Empezando con React + TypeScript + Vite como base.


```json
{
  "name": "mi-aplicacion",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}

```

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

```

```jsonc
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}

```

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mi Aplicación</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

```typescriptreact
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

```

```typescriptreact
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>¡Bienvenido a tu Aplicación!</h1>
        <p>Esta es una aplicación creada desde cero con React + TypeScript + Vite</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <h2>Contador de Ejemplo</h2>
          <button onClick={() => setCount((count) => count + 1)}>
            El contador es {count}
          </button>
          <p>
            Edita <code>src/App.tsx</code> y guarda para ver los cambios
          </p>
        </div>
        
        <div className="card">
          <h2>Recursos Útiles</h2>
          <ul>
            <li>
              <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
                Documentación de React
              </a>
            </li>
            <li>
              <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
                Documentación de Vite
              </a>
            </li>
            <li>
              <a href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer">
                Documentación de TypeScript
              </a>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App

```

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  margin: 0 auto;
  text-align: center;
}

```

```css
.app {
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
}

.app-header {
  margin-bottom: 3rem;
}

.app-header h1 {
  font-size: 3.2em;
  line-height: 1.1;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-header p {
  font-size: 1.2em;
  color: rgba(255, 255, 255, 0.7);
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.card {
  padding: 2rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.card h2 {
  margin-bottom: 1rem;
  color: #fff;
}

.card button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: #fff;
  cursor: pointer;
  transition: border-color 0.25s, background-color 0.25s;
  margin: 1rem 0;
}

.card button:hover {
  border-color: #646cff;
  background-color: #2a2a2a;
}

.card button:focus,
.card button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.card p {
  margin-top: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.card code {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #646cff;
}

.card ul {
  list-style: none;
  padding: 0;
  text-align: left;
}

.card li {
  margin: 0.8rem 0;
}

.card a {
  color: #646cff;
  text-decoration: none;
  transition: color 0.25s;
}

.card a:hover {
  color: #535bf2;
  text-decoration: underline;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }

  .card {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .card button {
    background-color: #f9f9f9;
    color: #213547;
  }

  .card button:hover {
    background-color: #e9e9e9;
  }

  .app-header p {
    color: rgba(0, 0, 0, 0.7);
  }

  .card p {
    color: rgba(0, 0, 0, 0.7);
  }

  .card code {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

```

```ignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}

```


Creando el README con instrucciones en español:


```markdown
# Mi Aplicación

Una aplicación web moderna creada desde cero con React, TypeScript y Vite.

## 🚀 Inicio Rápido

### Prerrequisitos

Asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- npm o yarn

### Instalación

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
│   ├── App.tsx          # Componente principal de la aplicación
│   ├── App.css          # Estilos del componente App
│   ├── main.tsx         # Punto de entrada de la aplicación
│   └── index.css        # Estilos globales
├── index.html           # Plantilla HTML
├── package.json         # Dependencias y scripts
├── tsconfig.json        # Configuración de TypeScript
├── vite.config.ts       # Configuración de Vite
└── README.md           # Este archivo
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Ejecuta el linter para verificar el código

## 🎨 Personalización

### Cambiar el Título

Edita el archivo `index.html` y cambia el contenido de la etiqueta `<title>`.

### Modificar el Componente Principal

Edita `src/App.tsx` para personalizar la aplicación. Puedes:
- Agregar nuevos componentes
- Cambiar el contenido
- Modificar la funcionalidad

### Cambiar los Estilos

- `src/index.css` - Estilos globales
- `src/App.css` - Estilos del componente App

## 📚 Tecnologías Utilizadas

- **React 18** - Biblioteca de JavaScript para construir interfaces de usuario
- **TypeScript** - Superset de JavaScript con tipado estático
- **Vite** - Herramienta de construcción rápida para desarrollo frontend
- **ESLint** - Herramienta de análisis de código

## 🔧 Próximos Pasos

1. **Agregar más componentes:**
   Crea nuevos archivos en la carpeta `src/` para organizar mejor tu código.

2. **Instalar librerías adicionales:**
   ```bash
   npm install nombre-de-la-libreria
   ```

3. **Configurar rutas:**
   Si necesitas navegación, instala React Router:
   ```bash
   npm install react-router-dom
   ```

4. **Agregar estado global:**
   Considera usar Context API o una librería como Zustand o Redux.

## 📖 Recursos de Aprendizaje

- [Documentación de React](https://react.dev)
- [Documentación de Vite](https://vitejs.dev)
- [Documentación de TypeScript](https://www.typescriptlang.org)

## 📝 Notas

- Los cambios en el código se reflejan automáticamente gracias a Hot Module Replacement (HMR)
- La aplicación está configurada para funcionar en modo claro y oscuro según las preferencias del sistema
- Todos los archivos TypeScript están configurados con modo estricto para mayor seguridad de tipos

## 🤝 Contribuir

¡Siéntete libre de modificar y extender esta aplicación según tus necesidades!

---

¡Feliz desarrollo! 🎉

```


Aplicación web creada desde cero con React, TypeScript y Vite. Incluye:

## Lo que se ha creado:

1. **Estructura del proyecto:**
   - `package.json` - Dependencias y scripts
   - `tsconfig.json` - Configuración de TypeScript
   - `vite.config.ts` - Configuración de Vite
   - `.eslintrc.cjs` - Configuración de ESLint
   - `.gitignore` - Archivos a ignorar en Git

2. **Código de la aplicación:**
   - `index.html` - Plantilla HTML principal
   - `src/main.tsx` - Punto de entrada
   - `src/App.tsx` - Componente principal con ejemplo de contador
   - `src/index.css` - Estilos globales
   - `src/App.css` - Estilos del componente

3. **Documentación:**
   - `README.md` - Instrucciones en español

## Para empezar:

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

3. **Abre tu navegador** en `http://localhost:5173`

La aplicación incluye:
- Un contador de ejemplo interactivo
- Estilos con modo claro/oscuro
- Enlaces a documentación útil
- Configuración lista para desarrollo

Puedes empezar a editar `src/App.tsx` para personalizar la aplicación. Los cambios se reflejan automáticamente gracias a Hot Module Replacement.

¿Quieres que agregue alguna funcionalidad específica o que cambie algo?

```shellscript
   npm install
```

```shellscript
   npm run dev
```

---

**User**

Regla general para todas las tablas se deben generar funciones para agregar , modificar, borra, listar  con distintos filtros tanto por pantalla como por impresora

Necesito una aplicacion que me permita, siendo la organizacion un club social y deportivo, llevar una tabla  de socios con los siguintes datos:

-Numero de socio

-Apellido

-Nombre 

-Documento nacional de identidad argentino

-Fecha de nacimiento

-Calle 

-Numero de casa

-Localidad

-Provincia

-telefono con formato para whastapp

-email

-Categoria de socio , se debebe crear una tabla con datos como id de categoria y nombre

-Obrasocial 

-numero de afiliado a obra social

-fecha de alta como socio

-fecha de baja como socio





---

**Cursor**


Creando la aplicación de gestión de socios con CRUD, filtros e impresión. Organizando la estructura del proyecto.



Actualizando dependencias y creando la estructura de la aplicación:


```json
{
  "name": "mi-aplicacion",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}


```

```typescript
export interface Categoria {
  id: number;
  nombre: string;
}

export interface Socio {
  id: number;
  numeroSocio: number;
  apellido: string;
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  calle: string;
  numeroCasa: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
  categoriaId: number;
  obraSocial: string;
  numeroAfiliado: string;
  fechaAlta: string;
  fechaBaja: string | null;
}

export interface FiltrosSocio {
  numeroSocio?: string;
  apellido?: string;
  nombre?: string;
  dni?: string;
  categoriaId?: number;
  activo?: boolean;
  provincia?: string;
  localidad?: string;
}

```

```typescript
// Servicio para manejar el almacenamiento local (localStorage)
// En producción, esto podría ser reemplazado por llamadas a una API

const STORAGE_KEYS = {
  SOCIOS: 'socios',
  CATEGORIAS: 'categorias',
} as const;

export const storageService = {
  // Gestión de Socios
  getSocios: (): Socio[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SOCIOS);
    return data ? JSON.parse(data) : [];
  },

  saveSocios: (socios: Socio[]): void => {
    localStorage.setItem(STORAGE_KEYS.SOCIOS, JSON.stringify(socios));
  },

  // Gestión de Categorías
  getCategorias: (): Categoria[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    return data ? JSON.parse(data) : [];
  },

  saveCategorias: (categorias: Categoria[]): void => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(categorias));
  },
};

import type { Socio, Categoria } from '../types';

```

```typescript
import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Socio, FiltrosSocio } from '../types';

export const useSocios = () => {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocios();
  }, []);

  const loadSocios = () => {
    setLoading(true);
    const data = storageService.getSocios();
    setSocios(data);
    setLoading(false);
  };

  const agregarSocio = (socio: Omit<Socio, 'id'>): Socio => {
    const nuevoId = socios.length > 0 ? Math.max(...socios.map(s => s.id)) + 1 : 1;
    const nuevoSocio: Socio = { ...socio, id: nuevoId };
    const nuevosSocios = [...socios, nuevoSocio];
    setSocios(nuevosSocios);
    storageService.saveSocios(nuevosSocios);
    return nuevoSocio;
  };

  const modificarSocio = (id: number, socio: Partial<Socio>): boolean => {
    const index = socios.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    const sociosActualizados = [...socios];
    sociosActualizados[index] = { ...sociosActualizados[index], ...socio };
    setSocios(sociosActualizados);
    storageService.saveSocios(sociosActualizados);
    return true;
  };

  const borrarSocio = (id: number): boolean => {
    const sociosFiltrados = socios.filter(s => s.id !== id);
    if (sociosFiltrados.length === socios.length) return false;
    
    setSocios(sociosFiltrados);
    storageService.saveSocios(sociosFiltrados);
    return true;
  };

  const listarSocios = (filtros?: FiltrosSocio): Socio[] => {
    let resultado = [...socios];

    if (filtros) {
      if (filtros.numeroSocio) {
        resultado = resultado.filter(s => 
          s.numeroSocio.toString().includes(filtros.numeroSocio!)
        );
      }
      if (filtros.apellido) {
        resultado = resultado.filter(s => 
          s.apellido.toLowerCase().includes(filtros.apellido!.toLowerCase())
        );
      }
      if (filtros.nombre) {
        resultado = resultado.filter(s => 
          s.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase())
        );
      }
      if (filtros.dni) {
        resultado = resultado.filter(s => 
          s.dni.includes(filtros.dni!)
        );
      }
      if (filtros.categoriaId) {
        resultado = resultado.filter(s => s.categoriaId === filtros.categoriaId);
      }
      if (filtros.activo !== undefined) {
        if (filtros.activo) {
          resultado = resultado.filter(s => !s.fechaBaja);
        } else {
          resultado = resultado.filter(s => !!s.fechaBaja);
        }
      }
      if (filtros.provincia) {
        resultado = resultado.filter(s => 
          s.provincia.toLowerCase().includes(filtros.provincia!.toLowerCase())
        );
      }
      if (filtros.localidad) {
        resultado = resultado.filter(s => 
          s.localidad.toLowerCase().includes(filtros.localidad!.toLowerCase())
        );
      }
    }

    return resultado;
  };

  const getSocioById = (id: number): Socio | undefined => {
    return socios.find(s => s.id === id);
  };

  return {
    socios,
    loading,
    agregarSocio,
    modificarSocio,
    borrarSocio,
    listarSocios,
    getSocioById,
    loadSocios,
  };
};

```

```typescript
import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Categoria } from '../types';

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategorias();
    // Inicializar con categorías por defecto si no hay ninguna
    const data = storageService.getCategorias();
    if (data.length === 0) {
      const categoriasDefault: Categoria[] = [
        { id: 1, nombre: 'Activo' },
        { id: 2, nombre: 'Vitalicio' },
        { id: 3, nombre: 'Honorario' },
        { id: 4, nombre: 'Temporario' },
      ];
      storageService.saveCategorias(categoriasDefault);
      setCategorias(categoriasDefault);
    }
    setLoading(false);
  }, []);

  const loadCategorias = () => {
    setLoading(true);
    const data = storageService.getCategorias();
    setCategorias(data);
    setLoading(false);
  };

  const agregarCategoria = (categoria: Omit<Categoria, 'id'>): Categoria => {
    const nuevoId = categorias.length > 0 ? Math.max(...categorias.map(c => c.id)) + 1 : 1;
    const nuevaCategoria: Categoria = { ...categoria, id: nuevoId };
    const nuevasCategorias = [...categorias, nuevaCategoria];
    setCategorias(nuevasCategorias);
    storageService.saveCategorias(nuevasCategorias);
    return nuevaCategoria;
  };

  const modificarCategoria = (id: number, categoria: Partial<Categoria>): boolean => {
    const index = categorias.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const categoriasActualizadas = [...categorias];
    categoriasActualizadas[index] = { ...categoriasActualizadas[index], ...categoria };
    setCategorias(categoriasActualizadas);
    storageService.saveCategorias(categoriasActualizadas);
    return true;
  };

  const borrarCategoria = (id: number): boolean => {
    const categoriasFiltradas = categorias.filter(c => c.id !== id);
    if (categoriasFiltradas.length === categorias.length) return false;
    
    setCategorias(categoriasFiltradas);
    storageService.saveCategorias(categoriasFiltradas);
    return true;
  };

  const listarCategorias = (): Categoria[] => {
    return [...categorias];
  };

  const getCategoriaById = (id: number): Categoria | undefined => {
    return categorias.find(c => c.id === id);
  };

  return {
    categorias,
    loading,
    agregarCategoria,
    modificarCategoria,
    borrarCategoria,
    listarCategorias,
    getCategoriaById,
    loadCategorias,
  };
};

```


Corrigiendo el orden de imports en `src/services/storage.ts`:


```typescript
import type { Socio, Categoria } from '../types';

// Servicio para manejar el almacenamiento local (localStorage)
// En producción, esto podría ser reemplazado por llamadas a una API

const STORAGE_KEYS = {
  SOCIOS: 'socios',
  CATEGORIAS: 'categorias',
} as const;

export const storageService = {
  // Gestión de Socios
  getSocios: (): Socio[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SOCIOS);
    return data ? JSON.parse(data) : [];
  },

  saveSocios: (socios: Socio[]): void => {
    localStorage.setItem(STORAGE_KEYS.SOCIOS, JSON.stringify(socios));
  },

  // Gestión de Categorías
  getCategorias: (): Categoria[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    return data ? JSON.parse(data) : [];
  },

  saveCategorias: (categorias: Categoria[]): void => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(categorias));
  },
};


```


Creando los componentes de formulario:


```typescriptreact
import { useState, useEffect } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import type { Socio } from '../types';
import './FormularioSocio.css';

interface FormularioSocioProps {
  socio?: Socio;
  onSubmit: (socio: Omit<Socio, 'id'>) => void;
  onCancel: () => void;
}

export const FormularioSocio = ({ socio, onSubmit, onCancel }: FormularioSocioProps) => {
  const { categorias } = useCategorias();
  const [formData, setFormData] = useState({
    numeroSocio: socio?.numeroSocio || 0,
    apellido: socio?.apellido || '',
    nombre: socio?.nombre || '',
    dni: socio?.dni || '',
    fechaNacimiento: socio?.fechaNacimiento || '',
    calle: socio?.calle || '',
    numeroCasa: socio?.numeroCasa || '',
    localidad: socio?.localidad || '',
    provincia: socio?.provincia || '',
    telefono: socio?.telefono || '',
    email: socio?.email || '',
    categoriaId: socio?.categoriaId || categorias[0]?.id || 0,
    obraSocial: socio?.obraSocial || '',
    numeroAfiliado: socio?.numeroAfiliado || '',
    fechaAlta: socio?.fechaAlta || new Date().toISOString().split('T')[0],
    fechaBaja: socio?.fechaBaja || null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatTelefono = (value: string) => {
    // Formato para WhatsApp: +54 9 11 1234-5678
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return `+${cleaned}`;
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 10) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 10)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 10)}-${cleaned.slice(10, 14)}`;
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefono(e.target.value);
    setFormData(prev => ({ ...prev, telefono: formatted }));
  };

  return (
    <div className="formulario-socio">
      <h2>{socio ? 'Modificar Socio' : 'Agregar Nuevo Socio'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="numeroSocio">Número de Socio *</label>
            <input
              type="number"
              id="numeroSocio"
              name="numeroSocio"
              value={formData.numeroSocio}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido *</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dni">DNI *</label>
            <input
              type="text"
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              required
              maxLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaNacimiento">Fecha de Nacimiento *</label>
            <input
              type="date"
              id="fechaNacimiento"
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="calle">Calle *</label>
            <input
              type="text"
              id="calle"
              name="calle"
              value={formData.calle}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroCasa">Número de Casa *</label>
            <input
              type="text"
              id="numeroCasa"
              name="numeroCasa"
              value={formData.numeroCasa}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="localidad">Localidad *</label>
            <input
              type="text"
              id="localidad"
              name="localidad"
              value={formData.localidad}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="provincia">Provincia *</label>
            <input
              type="text"
              id="provincia"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono (WhatsApp)</label>
            <input
              type="text"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleTelefonoChange}
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoriaId">Categoría de Socio *</label>
            <select
              id="categoriaId"
              name="categoriaId"
              value={formData.categoriaId}
              onChange={handleChange}
              required
            >
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="obraSocial">Obra Social</label>
            <input
              type="text"
              id="obraSocial"
              name="obraSocial"
              value={formData.obraSocial}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroAfiliado">Número de Afiliado</label>
            <input
              type="text"
              id="numeroAfiliado"
              name="numeroAfiliado"
              value={formData.numeroAfiliado}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaAlta">Fecha de Alta *</label>
            <input
              type="date"
              id="fechaAlta"
              name="fechaAlta"
              value={formData.fechaAlta}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaBaja">Fecha de Baja</label>
            <input
              type="date"
              id="fechaBaja"
              name="fechaBaja"
              value={formData.fechaBaja || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaBaja: e.target.value || null }))}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {socio ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

```

```css
.formulario-socio {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.formulario-socio h2 {
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.8rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.btn-submit,
.btn-cancel {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit {
  background-color: #667eea;
  color: white;
}

.btn-submit:hover {
  background-color: #5568d3;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #333;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-submit,
  .btn-cancel {
    width: 100%;
  }
}

```

```typescriptreact
import { useState } from 'react';
import type { Categoria } from '../types';
import './FormularioCategoria.css';

interface FormularioCategoriaProps {
  categoria?: Categoria;
  onSubmit: (categoria: Omit<Categoria, 'id'>) => void;
  onCancel: () => void;
}

export const FormularioCategoria = ({ categoria, onSubmit, onCancel }: FormularioCategoriaProps) => {
  const [nombre, setNombre] = useState(categoria?.nombre || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ nombre });
  };

  return (
    <div className="formulario-categoria">
      <h2>{categoria ? 'Modificar Categoría' : 'Agregar Nueva Categoría'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre de la Categoría *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej: Activo, Vitalicio, Honorario"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" className="btn-submit">
            {categoria ? 'Modificar' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

```

```css
.formulario-categoria {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.formulario-categoria h2 {
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 2rem;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.btn-submit,
.btn-cancel {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit {
  background-color: #667eea;
  color: white;
}

.btn-submit:hover {
  background-color: #5568d3;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #333;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
  }
  
  .btn-submit,
  .btn-cancel {
    width: 100%;
  }
}

```


Creando los componentes de lista con filtros:


```typescriptreact
import { useState } from 'react';
import { useSocios } from '../hooks/useSocios';
import { useCategorias } from '../hooks/useCategorias';
import { FormularioSocio } from './FormularioSocio';
import { FiltrosSocios } from './FiltrosSocios';
import { TablaSocios } from './TablaSocios';
import { ImprimirSocios } from './ImprimirSocios';
import type { Socio, FiltrosSocio } from '../types';
import './ListaSocios.css';

export const ListaSocios = () => {
  const { socios, agregarSocio, modificarSocio, borrarSocio, listarSocios } = useSocios();
  const { categorias } = useCategorias();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [socioEditando, setSocioEditando] = useState<Socio | undefined>(undefined);
  const [filtros, setFiltros] = useState<FiltrosSocio>({});
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  const sociosFiltrados = listarSocios(filtros);

  const handleAgregar = () => {
    setSocioEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (socio: Socio) => {
    setSocioEditando(socio);
    setMostrarFormulario(true);
  };

  const handleBorrar = (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar este socio?')) {
      borrarSocio(id);
    }
  };

  const handleSubmit = (socioData: Omit<Socio, 'id'>) => {
    if (socioEditando) {
      modificarSocio(socioEditando.id, socioData);
    } else {
      agregarSocio(socioData);
    }
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setSocioEditando(undefined);
  };

  const handleImprimir = () => {
    setMostrarImpresion(true);
  };

  if (mostrarImpresion) {
    return (
      <ImprimirSocios
        socios={sociosFiltrados}
        categorias={categorias}
        filtros={filtros}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-socios">
        <FormularioSocio
          socio={socioEditando}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-socios">
      <div className="lista-header">
        <h1>Gestión de Socios</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Socio
          </button>
          <button onClick={handleImprimir} className="btn-imprimir">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <FiltrosSocios
        filtros={filtros}
        categorias={categorias}
        onChange={setFiltros}
      />

      <div className="lista-info">
        <p>Total de socios: {sociosFiltrados.length}</p>
      </div>

      <TablaSocios
        socios={sociosFiltrados}
        categorias={categorias}
        onModificar={handleModificar}
        onBorrar={handleBorrar}
      />
    </div>
  );
};

```

```css
.lista-socios {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.lista-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.lista-header h1 {
  color: #333;
  font-size: 2rem;
  margin: 0;
}

.lista-actions {
  display: flex;
  gap: 1rem;
}

.btn-agregar,
.btn-imprimir {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-agregar {
  background-color: #667eea;
  color: white;
}

.btn-agregar:hover {
  background-color: #5568d3;
}

.btn-imprimir {
  background-color: #48bb78;
  color: white;
}

.btn-imprimir:hover {
  background-color: #38a169;
}

.lista-info {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .lista-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .lista-actions {
    width: 100%;
  }
  
  .btn-agregar,
  .btn-imprimir {
    flex: 1;
  }
}

```

```typescriptreact
import { useState } from 'react';
import type { FiltrosSocio, Categoria } from '../types';
import './FiltrosSocios.css';

interface FiltrosSociosProps {
  filtros: FiltrosSocio;
  categorias: Categoria[];
  onChange: (filtros: FiltrosSocio) => void;
}

export const FiltrosSocios = ({ filtros, categorias, onChange }: FiltrosSociosProps) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosLocales, setFiltrosLocales] = useState<FiltrosSocio>(filtros);

  const handleChange = (name: keyof FiltrosSocio, value: string | number | boolean | undefined) => {
    const nuevosFiltros = { ...filtrosLocales, [name]: value || undefined };
    setFiltrosLocales(nuevosFiltros);
    onChange(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosVacios: FiltrosSocio = {};
    setFiltrosLocales(filtrosVacios);
    onChange(filtrosVacios);
  };

  const tieneFiltros = Object.values(filtros).some(v => v !== undefined && v !== '');

  return (
    <div className="filtros-socios">
      <div className="filtros-header">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="btn-toggle-filtros"
        >
          {mostrarFiltros ? '▼' : '▶'} Filtros de Búsqueda
        </button>
        {tieneFiltros && (
          <button onClick={limpiarFiltros} className="btn-limpiar">
            Limpiar Filtros
          </button>
        )}
      </div>

      {mostrarFiltros && (
        <div className="filtros-content">
          <div className="filtros-grid">
            <div className="filtro-group">
              <label htmlFor="numeroSocio">Número de Socio</label>
              <input
                type="text"
                id="numeroSocio"
                value={filtrosLocales.numeroSocio || ''}
                onChange={(e) => handleChange('numeroSocio', e.target.value)}
                placeholder="Buscar por número..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="apellido">Apellido</label>
              <input
                type="text"
                id="apellido"
                value={filtrosLocales.apellido || ''}
                onChange={(e) => handleChange('apellido', e.target.value)}
                placeholder="Buscar por apellido..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                type="text"
                id="nombre"
                value={filtrosLocales.nombre || ''}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Buscar por nombre..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="dni">DNI</label>
              <input
                type="text"
                id="dni"
                value={filtrosLocales.dni || ''}
                onChange={(e) => handleChange('dni', e.target.value)}
                placeholder="Buscar por DNI..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="categoriaId">Categoría</label>
              <select
                id="categoriaId"
                value={filtrosLocales.categoriaId || ''}
                onChange={(e) => handleChange('categoriaId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-group">
              <label htmlFor="activo">Estado</label>
              <select
                id="activo"
                value={filtrosLocales.activo === undefined ? '' : filtrosLocales.activo ? 'activo' : 'inactivo'}
                onChange={(e) => handleChange('activo', e.target.value === '' ? undefined : e.target.value === 'activo')}
              >
                <option value="">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            <div className="filtro-group">
              <label htmlFor="provincia">Provincia</label>
              <input
                type="text"
                id="provincia"
                value={filtrosLocales.provincia || ''}
                onChange={(e) => handleChange('provincia', e.target.value)}
                placeholder="Buscar por provincia..."
              />
            </div>

            <div className="filtro-group">
              <label htmlFor="localidad">Localidad</label>
              <input
                type="text"
                id="localidad"
                value={filtrosLocales.localidad || ''}
                onChange={(e) => handleChange('localidad', e.target.value)}
                placeholder="Buscar por localidad..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

```

```css
.filtros-socios {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filtros-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-toggle-filtros {
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 500;
  color: #667eea;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.btn-toggle-filtros:hover {
  color: #5568d3;
}

.btn-limpiar {
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-limpiar:hover {
  background-color: #e0e0e0;
}

.filtros-content {
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.filtros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filtro-group {
  display: flex;
  flex-direction: column;
}

.filtro-group label {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.filtro-group input,
.filtro-group select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.filtro-group input:focus,
.filtro-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

@media (max-width: 768px) {
  .filtros-grid {
    grid-template-columns: 1fr;
  }
}

```

```typescriptreact
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Socio, Categoria } from '../types';
import './TablaSocios.css';

interface TablaSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  onModificar: (socio: Socio) => void;
  onBorrar: (id: number) => void;
}

export const TablaSocios = ({ socios, categorias, onModificar, onBorrar }: TablaSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  if (socios.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No se encontraron socios con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="tabla-socios-container">
      <div className="tabla-wrapper">
        <table className="tabla-socios">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Fecha Alta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>
                  <span className={`badge ${socio.fechaBaja ? 'badge-inactivo' : 'badge-activo'}`}>
                    {socio.fechaBaja ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(socio)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(socio.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

```

```css
.tabla-socios-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabla-wrapper {
  overflow-x: auto;
}

.tabla-socios {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla-socios thead {
  background-color: #667eea;
  color: white;
}

.tabla-socios th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}

.tabla-socios td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.tabla-socios tbody tr:hover {
  background-color: #f5f5f5;
}

.tabla-socios tbody tr.inactivo {
  background-color: #fff5f5;
  opacity: 0.7;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge-activo {
  background-color: #c6f6d5;
  color: #22543d;
}

.badge-inactivo {
  background-color: #fed7d7;
  color: #742a2a;
}

.acciones {
  display: flex;
  gap: 0.5rem;
}

.btn-accion {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  transition: transform 0.2s;
  border-radius: 4px;
}

.btn-accion:hover {
  transform: scale(1.2);
  background-color: #f0f0f0;
}

.btn-modificar:hover {
  background-color: #e3f2fd;
}

.btn-borrar:hover {
  background-color: #ffebee;
}

.tabla-vacia {
  background: white;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  color: #666;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .tabla-socios {
    font-size: 0.8rem;
  }
  
  .tabla-socios th,
  .tabla-socios td {
    padding: 0.5rem;
  }
}

```


Creando el componente de impresión y los componentes de categorías:


```typescriptreact
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import './ImprimirSocios.css';

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.numeroSocio) filtrosTexto.push(`N° Socio: ${filtros.numeroSocio}`);
    if (filtros.apellido) filtrosTexto.push(`Apellido: ${filtros.apellido}`);
    if (filtros.nombre) filtrosTexto.push(`Nombre: ${filtros.nombre}`);
    if (filtros.dni) filtrosTexto.push(`DNI: ${filtros.dni}`);
    if (filtros.categoriaId) {
      const categoria = categorias.find(c => c.id === filtros.categoriaId);
      filtrosTexto.push(`Categoría: ${categoria?.nombre || ''}`);
    }
    if (filtros.activo !== undefined) filtrosTexto.push(`Estado: ${filtros.activo ? 'Activo' : 'Inactivo'}`);
    if (filtros.provincia) filtrosTexto.push(`Provincia: ${filtros.provincia}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  return (
    <div className="imprimir-socios">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Socios</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
          <p className="total-socios">Total de socios: {socios.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Fecha Nac.</th>
              <th>Dirección</th>
              <th>Localidad</th>
              <th>Provincia</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Obra Social</th>
              <th>N° Afiliado</th>
              <th>Fecha Alta</th>
              <th>Fecha Baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{formatFecha(socio.fechaNacimiento)}</td>
                <td>{socio.calle} {socio.numeroCasa}</td>
                <td>{socio.localidad}</td>
                <td>{socio.provincia}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{socio.obraSocial || '-'}</td>
                <td>{socio.numeroAfiliado || '-'}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>{formatFecha(socio.fechaBaja)}</td>
                <td>{socio.fechaBaja ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

```

```css
.imprimir-socios {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.imprimir-controls {
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
}

.btn-imprimir,
.btn-volver {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-imprimir {
  background-color: #667eea;
  color: white;
}

.btn-imprimir:hover {
  background-color: #5568d3;
}

.btn-volver {
  background-color: #f5f5f5;
  color: #333;
}

.btn-volver:hover {
  background-color: #e0e0e0;
}

.imprimir-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.imprimir-header {
  margin-bottom: 2rem;
  text-align: center;
  border-bottom: 2px solid #667eea;
  padding-bottom: 1rem;
}

.imprimir-header h1 {
  color: #333;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.fecha-impresion,
.filtros-aplicados,
.total-socios {
  margin: 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.tabla-imprimir {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  margin-top: 1rem;
}

.tabla-imprimir thead {
  background-color: #667eea;
  color: white;
}

.tabla-imprimir th {
  padding: 0.75rem 0.5rem;
  text-align: left;
  font-weight: 600;
  border: 1px solid #ddd;
}

.tabla-imprimir td {
  padding: 0.5rem;
  border: 1px solid #ddd;
}

.tabla-imprimir tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

.tabla-imprimir tbody tr.inactivo {
  background-color: #fff5f5;
  opacity: 0.8;
}

/* Estilos para impresión */
@media print {
  .no-print {
    display: none !important;
  }

  .imprimir-socios {
    padding: 0;
  }

  .imprimir-content {
    box-shadow: none;
    padding: 0;
  }

  .tabla-imprimir {
    font-size: 0.7rem;
  }

  .tabla-imprimir th,
  .tabla-imprimir td {
    padding: 0.3rem;
  }

  .imprimir-header {
    page-break-after: avoid;
  }

  .tabla-imprimir thead {
    display: table-header-group;
  }

  .tabla-imprimir tbody tr {
    page-break-inside: avoid;
  }
}

```

```typescriptreact
import { useState } from 'react';
import { useCategorias } from '../hooks/useCategorias';
import { FormularioCategoria } from './FormularioCategoria';
import { TablaCategorias } from './TablaCategorias';
import { ImprimirCategorias } from './ImprimirCategorias';
import type { Categoria } from '../types';
import './ListaCategorias.css';

export const ListaCategorias = () => {
  const { categorias, agregarCategoria, modificarCategoria, borrarCategoria, listarCategorias } = useCategorias();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>(undefined);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);

  const categoriasListadas = listarCategorias();

  const handleAgregar = () => {
    setCategoriaEditando(undefined);
    setMostrarFormulario(true);
  };

  const handleModificar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setMostrarFormulario(true);
  };

  const handleBorrar = (id: number) => {
    if (window.confirm('¿Está seguro que desea eliminar esta categoría?')) {
      borrarCategoria(id);
    }
  };

  const handleSubmit = (categoriaData: Omit<Categoria, 'id'>) => {
    if (categoriaEditando) {
      modificarCategoria(categoriaEditando.id, categoriaData);
    } else {
      agregarCategoria(categoriaData);
    }
    setMostrarFormulario(false);
    setCategoriaEditando(undefined);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setCategoriaEditando(undefined);
  };

  if (mostrarImpresion) {
    return (
      <ImprimirCategorias
        categorias={categoriasListadas}
        onVolver={() => setMostrarImpresion(false)}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="lista-categorias">
        <FormularioCategoria
          categoria={categoriaEditando}
          onSubmit={handleSubmit}
          onCancel={handleCancelar}
        />
      </div>
    );
  }

  return (
    <div className="lista-categorias">
      <div className="lista-header">
        <h1>Gestión de Categorías</h1>
        <div className="lista-actions">
          <button onClick={handleAgregar} className="btn-agregar">
            + Agregar Categoría
          </button>
          <button onClick={() => setMostrarImpresion(true)} className="btn-imprimir">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <div className="lista-info">
        <p>Total de categorías: {categoriasListadas.length}</p>
      </div>

      <TablaCategorias
        categorias={categoriasListadas}
        onModificar={handleModificar}
        onBorrar={handleBorrar}
      />
    </div>
  );
};

```

```css
.lista-categorias {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.lista-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.lista-header h1 {
  color: #333;
  font-size: 2rem;
  margin: 0;
}

.lista-actions {
  display: flex;
  gap: 1rem;
}

.btn-agregar,
.btn-imprimir {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-agregar {
  background-color: #667eea;
  color: white;
}

.btn-agregar:hover {
  background-color: #5568d3;
}

.btn-imprimir {
  background-color: #48bb78;
  color: white;
}

.btn-imprimir:hover {
  background-color: #38a169;
}

.lista-info {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .lista-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .lista-actions {
    width: 100%;
  }
  
  .btn-agregar,
  .btn-imprimir {
    flex: 1;
  }
}

```

```typescriptreact
import type { Categoria } from '../types';
import './TablaCategorias.css';

interface TablaCategoriasProps {
  categorias: Categoria[];
  onModificar: (categoria: Categoria) => void;
  onBorrar: (id: number) => void;
}

export const TablaCategorias = ({ categorias, onModificar, onBorrar }: TablaCategoriasProps) => {
  if (categorias.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No hay categorías registradas.</p>
      </div>
    );
  }

  return (
    <div className="tabla-categorias-container">
      <div className="tabla-wrapper">
        <table className="tabla-categorias">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(categoria)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(categoria.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

```

```css
.tabla-categorias-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabla-wrapper {
  overflow-x: auto;
}

.tabla-categorias {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla-categorias thead {
  background-color: #667eea;
  color: white;
}

.tabla-categorias th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

.tabla-categorias td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.tabla-categorias tbody tr:hover {
  background-color: #f5f5f5;
}

.acciones {
  display: flex;
  gap: 0.5rem;
}

.btn-accion {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  transition: transform 0.2s;
  border-radius: 4px;
}

.btn-accion:hover {
  transform: scale(1.2);
  background-color: #f0f0f0;
}

.btn-modificar:hover {
  background-color: #e3f2fd;
}

.btn-borrar:hover {
  background-color: #ffebee;
}

.tabla-vacia {
  background: white;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  color: #666;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

```

```typescriptreact
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="imprimir-categorias">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Categorías</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          <p className="total-categorias">Total de categorías: {categorias.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

```

```css
.imprimir-categorias {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.imprimir-controls {
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
}

.btn-imprimir,
.btn-volver {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-imprimir {
  background-color: #667eea;
  color: white;
}

.btn-imprimir:hover {
  background-color: #5568d3;
}

.btn-volver {
  background-color: #f5f5f5;
  color: #333;
}

.btn-volver:hover {
  background-color: #e0e0e0;
}

.imprimir-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.imprimir-header {
  margin-bottom: 2rem;
  text-align: center;
  border-bottom: 2px solid #667eea;
  padding-bottom: 1rem;
}

.imprimir-header h1 {
  color: #333;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.fecha-impresion,
.total-categorias {
  margin: 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.tabla-imprimir {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.tabla-imprimir thead {
  background-color: #667eea;
  color: white;
}

.tabla-imprimir th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  border: 1px solid #ddd;
}

.tabla-imprimir td {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
}

.tabla-imprimir tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* Estilos para impresión */
@media print {
  .no-print {
    display: none !important;
  }

  .imprimir-categorias {
    padding: 0;
  }

  .imprimir-content {
    box-shadow: none;
    padding: 0;
  }

  .imprimir-header {
    page-break-after: avoid;
  }

  .tabla-imprimir thead {
    display: table-header-group;
  }

  .tabla-imprimir tbody tr {
    page-break-inside: avoid;
  }
}

```


Creando el layout con navegación y actualizando App.tsx con routing:


```typescriptreact
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Club Social y Deportivo</h1>
        </div>
        <ul className="navbar-nav">
          <li>
            <Link
              to="/socios"
              className={location.pathname === '/socios' ? 'active' : ''}
            >
              Socios
            </Link>
          </li>
          <li>
            <Link
              to="/categorias"
              className={location.pathname === '/categorias' ? 'active' : ''}
            >
              Categorías
            </Link>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

```

```css
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.navbar {
  background-color: #667eea;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.navbar-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.navbar-nav {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
}

.navbar-nav li {
  margin: 0;
}

.navbar-nav a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  font-weight: 500;
}

.navbar-nav a:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.navbar-nav a.active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 0;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .navbar-nav {
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }

  .navbar-nav a {
    display: block;
    width: 100%;
  }
}

```


Actualizando App.tsx con routing y creando las páginas:


```typescriptreact
import { ListaSocios } from '../components/ListaSocios';

export const SociosPage = () => {
  return <ListaSocios />;
};

```

```typescriptreact
import { ListaCategorias } from '../components/ListaCategorias';

export const CategoriasPage = () => {
  return <ListaCategorias />;
};

```

```typescriptreact
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SociosPage } from './pages/SociosPage';
import { CategoriasPage } from './pages/CategoriasPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/socios" replace />} />
          <Route path="/socios" element={<SociosPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;


```

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light;
  color: #213547;
  background-color: #f5f5f5;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  min-height: 100vh;
}


```

```css
/* Estilos globales para la aplicación */


```


Corrigiendo el uso de date-fns en los componentes de impresión:


```typescriptreact
import { format } from 'date-fns';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import './ImprimirSocios.css';

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.numeroSocio) filtrosTexto.push(`N° Socio: ${filtros.numeroSocio}`);
    if (filtros.apellido) filtrosTexto.push(`Apellido: ${filtros.apellido}`);
    if (filtros.nombre) filtrosTexto.push(`Nombre: ${filtros.nombre}`);
    if (filtros.dni) filtrosTexto.push(`DNI: ${filtros.dni}`);
    if (filtros.categoriaId) {
      const categoria = categorias.find(c => c.id === filtros.categoriaId);
      filtrosTexto.push(`Categoría: ${categoria?.nombre || ''}`);
    }
    if (filtros.activo !== undefined) filtrosTexto.push(`Estado: ${filtros.activo ? 'Activo' : 'Inactivo'}`);
    if (filtros.provincia) filtrosTexto.push(`Provincia: ${filtros.provincia}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  return (
    <div className="imprimir-socios">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Socios</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
          <p className="total-socios">Total de socios: {socios.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Fecha Nac.</th>
              <th>Dirección</th>
              <th>Localidad</th>
              <th>Provincia</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Obra Social</th>
              <th>N° Afiliado</th>
              <th>Fecha Alta</th>
              <th>Fecha Baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{formatFecha(socio.fechaNacimiento)}</td>
                <td>{socio.calle} {socio.numeroCasa}</td>
                <td>{socio.localidad}</td>
                <td>{socio.provincia}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{socio.obraSocial || '-'}</td>
                <td>{socio.numeroAfiliado || '-'}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>{formatFecha(socio.fechaBaja)}</td>
                <td>{socio.fechaBaja ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import './ImprimirSocios.css';

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.numeroSocio) filtrosTexto.push(`N° Socio: ${filtros.numeroSocio}`);
    if (filtros.apellido) filtrosTexto.push(`Apellido: ${filtros.apellido}`);
    if (filtros.nombre) filtrosTexto.push(`Nombre: ${filtros.nombre}`);
    if (filtros.dni) filtrosTexto.push(`DNI: ${filtros.dni}`);
    if (filtros.categoriaId) {
      const categoria = categorias.find(c => c.id === filtros.categoriaId);
      filtrosTexto.push(`Categoría: ${categoria?.nombre || ''}`);
    }
    if (filtros.activo !== undefined) filtrosTexto.push(`Estado: ${filtros.activo ? 'Activo' : 'Inactivo'}`);
    if (filtros.provincia) filtrosTexto.push(`Provincia: ${filtros.provincia}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  return (
    <div className="imprimir-socios">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Socios</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
          <p className="total-socios">Total de socios: {socios.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Fecha Nac.</th>
              <th>Dirección</th>
              <th>Localidad</th>
              <th>Provincia</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Obra Social</th>
              <th>N° Afiliado</th>
              <th>Fecha Alta</th>
              <th>Fecha Baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{formatFecha(socio.fechaNacimiento)}</td>
                <td>{socio.calle} {socio.numeroCasa}</td>
                <td>{socio.localidad}</td>
                <td>{socio.provincia}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{socio.obraSocial || '-'}</td>
                <td>{socio.numeroAfiliado || '-'}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>{formatFecha(socio.fechaBaja)}</td>
                <td>{socio.fechaBaja ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Socio, Categoria, FiltrosSocio } from '../types';
import './ImprimirSocios.css';

interface ImprimirSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  filtros: FiltrosSocio;
  onVolver: () => void;
}

export const ImprimirSocios = ({ socios, categorias, filtros, onVolver }: ImprimirSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy');
    } catch {
      return fecha;
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const getFiltrosTexto = () => {
    const filtrosTexto: string[] = [];
    if (filtros.numeroSocio) filtrosTexto.push(`N° Socio: ${filtros.numeroSocio}`);
    if (filtros.apellido) filtrosTexto.push(`Apellido: ${filtros.apellido}`);
    if (filtros.nombre) filtrosTexto.push(`Nombre: ${filtros.nombre}`);
    if (filtros.dni) filtrosTexto.push(`DNI: ${filtros.dni}`);
    if (filtros.categoriaId) {
      const categoria = categorias.find(c => c.id === filtros.categoriaId);
      filtrosTexto.push(`Categoría: ${categoria?.nombre || ''}`);
    }
    if (filtros.activo !== undefined) filtrosTexto.push(`Estado: ${filtros.activo ? 'Activo' : 'Inactivo'}`);
    if (filtros.provincia) filtrosTexto.push(`Provincia: ${filtros.provincia}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    return filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Sin filtros';
  };

  return (
    <div className="imprimir-socios">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Socios</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="filtros-aplicados">{getFiltrosTexto()}</p>
          <p className="total-socios">Total de socios: {socios.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Fecha Nac.</th>
              <th>Dirección</th>
              <th>Localidad</th>
              <th>Provincia</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Obra Social</th>
              <th>N° Afiliado</th>
              <th>Fecha Alta</th>
              <th>Fecha Baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{formatFecha(socio.fechaNacimiento)}</td>
                <td>{socio.calle} {socio.numeroCasa}</td>
                <td>{socio.localidad}</td>
                <td>{socio.provincia}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{socio.obraSocial || '-'}</td>
                <td>{socio.numeroAfiliado || '-'}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>{formatFecha(socio.fechaBaja)}</td>
                <td>{socio.fechaBaja ? 'Inactivo' : 'Activo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="imprimir-categorias">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Categorías</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          <p className="total-categorias">Total de categorías: {categorias.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Categoria } from '../types';
import './ImprimirCategorias.css';

interface ImprimirCategoriasProps {
  categorias: Categoria[];
  onVolver: () => void;
}

export const ImprimirCategorias = ({ categorias, onVolver }: ImprimirCategoriasProps) => {
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="imprimir-categorias">
      <div className="imprimir-controls no-print">
        <button onClick={handleImprimir} className="btn-imprimir">
          🖨️ Imprimir
        </button>
        <button onClick={onVolver} className="btn-volver">
          ← Volver
        </button>
      </div>

      <div className="imprimir-content">
        <div className="imprimir-header">
          <h1>Listado de Categorías</h1>
          <p className="fecha-impresion">Fecha de impresión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p className="total-categorias">Total de categorías: {categorias.length}</p>
        </div>

        <table className="tabla-imprimir">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id}>
                <td>{categoria.id}</td>
                <td>{categoria.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Socio, Categoria } from '../types';
import './TablaSocios.css';

interface TablaSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  onModificar: (socio: Socio) => void;
  onBorrar: (id: number) => void;
}

export const TablaSocios = ({ socios, categorias, onModificar, onBorrar }: TablaSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  if (socios.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No se encontraron socios con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="tabla-socios-container">
      <div className="tabla-wrapper">
        <table className="tabla-socios">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Fecha Alta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>
                  <span className={`badge ${socio.fechaBaja ? 'badge-inactivo' : 'badge-activo'}`}>
                    {socio.fechaBaja ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(socio)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(socio.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```

```typescriptreact
import { format } from 'date-fns';
import type { Socio, Categoria } from '../types';
import './TablaSocios.css';

interface TablaSociosProps {
  socios: Socio[];
  categorias: Categoria[];
  onModificar: (socio: Socio) => void;
  onBorrar: (id: number) => void;
}

export const TablaSocios = ({ socios, categorias, onModificar, onBorrar }: TablaSociosProps) => {
  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy');
    } catch {
      return fecha;
    }
  };

  if (socios.length === 0) {
    return (
      <div className="tabla-vacia">
        <p>No se encontraron socios con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="tabla-socios-container">
      <div className="tabla-wrapper">
        <table className="tabla-socios">
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Fecha Alta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {socios.map(socio => (
              <tr key={socio.id} className={socio.fechaBaja ? 'inactivo' : ''}>
                <td>{socio.numeroSocio}</td>
                <td>{socio.apellido}</td>
                <td>{socio.nombre}</td>
                <td>{socio.dni}</td>
                <td>{socio.telefono || '-'}</td>
                <td>{socio.email || '-'}</td>
                <td>{getCategoriaNombre(socio.categoriaId)}</td>
                <td>{formatFecha(socio.fechaAlta)}</td>
                <td>
                  <span className={`badge ${socio.fechaBaja ? 'badge-inactivo' : 'badge-activo'}`}>
                    {socio.fechaBaja ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button
                      onClick={() => onModificar(socio)}
                      className="btn-accion btn-modificar"
                      title="Modificar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onBorrar(socio.id)}
                      className="btn-accion btn-borrar"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


```


Actualizando el README con las instrucciones de la nueva aplicación:


```markdown
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

```


Revisando el hook de categorías para asegurar que la inicialización funcione correctamente:



Corrigiendo la lógica de inicialización en el hook de categorías:


```typescript
import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Categoria } from '../types';

export const useCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const data = storageService.getCategorias();
    // Inicializar con categorías por defecto si no hay ninguna
    if (data.length === 0) {
      const categoriasDefault: Categoria[] = [
        { id: 1, nombre: 'Activo' },
        { id: 2, nombre: 'Vitalicio' },
        { id: 3, nombre: 'Honorario' },
        { id: 4, nombre: 'Temporario' },
      ];
      storageService.saveCategorias(categoriasDefault);
      setCategorias(categoriasDefault);
    } else {
      setCategorias(data);
    }
    setLoading(false);
  }, []);

  const loadCategorias = () => {
    setLoading(true);
    const data = storageService.getCategorias();
    setCategorias(data);
    setLoading(false);
  };

  const agregarCategoria = (categoria: Omit<Categoria, 'id'>): Categoria => {
    const nuevoId = categorias.length > 0 ? Math.max(...categorias.map(c => c.id)) + 1 : 1;
    const nuevaCategoria: Categoria = { ...categoria, id: nuevoId };
    const nuevasCategorias = [...categorias, nuevaCategoria];
    setCategorias(nuevasCategorias);
    storageService.saveCategorias(nuevasCategorias);
    return nuevaCategoria;
  };

  const modificarCategoria = (id: number, categoria: Partial<Categoria>): boolean => {
    const index = categorias.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const categoriasActualizadas = [...categorias];
    categoriasActualizadas[index] = { ...categoriasActualizadas[index], ...categoria };
    setCategorias(categoriasActualizadas);
    storageService.saveCategorias(categoriasActualizadas);
    return true;
  };

  const borrarCategoria = (id: number): boolean => {
    const categoriasFiltradas = categorias.filter(c => c.id !== id);
    if (categoriasFiltradas.length === categorias.length) return false;
    
    setCategorias(categoriasFiltradas);
    storageService.saveCategorias(categoriasFiltradas);
    return true;
  };

  const listarCategorias = (): Categoria[] => {
    return [...categorias];
  };

  const getCategoriaById = (id: number): Categoria | undefined => {
    return categorias.find(c => c.id === id);
  };

  return {
    categorias,
    loading,
    agregarCategoria,
    modificarCategoria,
    borrarCategoria,
    listarCategorias,
    getCategoriaById,
    loadCategorias,
  };
};


```


Aplicación de gestión de socios lista. Resumen:

## Aplicación completada

### Funcionalidades implementadas

1. Gestión de socios (CRUD)
   - Agregar nuevos socios
   - Modificar socios existentes
   - Borrar socios
   - Listar socios con filtros

2. Gestión de categorías (CRUD)
   - Agregar categorías
   - Modificar categorías
   - Borrar categorías
   - Listar categorías

3. Filtros de búsqueda para socios
   - Por número de socio
   - Por apellido
   - Por nombre
   - Por DNI
   - Por categoría
   - Por estado (Activo/Inactivo)
   - Por provincia
   - Por localidad

4. Impresión
   - Listados de socios con filtros aplicados
   - Listados de categorías
   - Vista optimizada para impresión

### Datos de socios incluidos
- Número de socio
- Apellido y Nombre
- DNI (Documento Nacional de Identidad Argentino)
- Fecha de nacimiento
- Dirección completa (Calle, Número, Localidad, Provincia)
- Teléfono (formato WhatsApp: +54 9 11 1234-5678)
- Email
- Categoría de socio (tabla separada)
- Obra social y número de afiliado
- Fecha de alta y fecha de baja

### Para empezar

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abre tu navegador en `http://localhost:5173`

### Características adicionales
- Navegación entre secciones (Socios y Categorías)
- Diseño responsive
- Validación de formularios
- Confirmación antes de borrar
- Indicadores visuales para socios activos/inactivos
- Almacenamiento local (localStorage) - listo para conectar con una API backend

La aplicación está lista para usar. Todas las tablas tienen funciones CRUD completas con filtros e impresión, siguiendo la regla general que solicitaste.

```shellscript
   npm install
```

```shellscript
   npm run dev
```

---

**User**

como ejecuto la aplicacion creada

---

**Cursor**


Verificando la configuración del proyecto antes de ejecutar la aplicación:



Instalando las dependencias:



Parece que Node.js/npm no está instalado o no está en el PATH. Instrucciones para ejecutar la aplicación:

## Pasos para ejecutar la aplicación

### Paso 1: Instalar Node.js (si no lo tienes)

1. Descarga Node.js desde: https://nodejs.org/
   - Recomendado: versión LTS (Long Term Support)
   - Incluye npm

2. Instala Node.js:
   - Ejecuta el instalador
   - Acepta la configuración por defecto
   - Marca la opción "Add to PATH" si aparece

3. Verifica la instalación:
   - Abre una nueva terminal (PowerShell o CMD)
   - Ejecuta:
     ```bash
     node --version
     npm --version
     ```

### Paso 2: Instalar las dependencias del proyecto

Abre una terminal en la carpeta del proyecto (`C:\Users\jnazareno\Desktop\Cursor`) y ejecuta:

```bash
npm install
```

Esto instalará:
- React y React DOM
- React Router (navegación)
- date-fns (manejo de fechas)
- TypeScript y herramientas de desarrollo
- Vite (servidor de desarrollo)

### Paso 3: Iniciar el servidor de desarrollo

Una vez instaladas las dependencias, ejecuta:

```bash
npm run dev
```

Verás algo como:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Paso 4: Abrir la aplicación

Abre tu navegador en:
```
http://localhost:5173
```

## Comandos útiles

- `npm run dev` - Inicia el servidor de desarrollo (con recarga automática)
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Verifica el código con el linter

## Solución de problemas

Si npm no se reconoce:
1. Reinicia la terminal después de instalar Node.js
2. Verifica que Node.js esté en el PATH del sistema
3. Prueba con `npx` en lugar de `npm` si está disponible

¿Necesitas ayuda con algún paso específico?

```shellscript
     node --version
     npm --version
```

```shellscript
npm install
```

```shellscript
npm run dev
```

```plaintext
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

```plaintext
http://localhost:5173
```

