# Cómo Instalar Git en Windows

## Método 1: Instalador Oficial (Recomendado)

### Paso 1: Descargar Git
1. Visita la página oficial de Git: **https://git-scm.com/download/win**
2. Haz clic en el botón de descarga (se descargará automáticamente la versión más reciente)
3. El archivo descargado será algo como: `Git-2.43.0-64-bit.exe`

### Paso 2: Instalar Git
1. **Ejecuta el instalador** que acabas de descargar
2. **Lee y acepta la licencia** (clic en "Next")
3. **Selecciona la ubicación de instalación** (puedes dejar la predeterminada) → "Next"
4. **Selecciona los componentes**:
   - ✅ Git Bash Here
   - ✅ Git GUI Here
   - ✅ Associate .git* configuration files with the default text editor
   - ✅ Associate .sh files to be run with Bash
   - Puedes dejar las opciones por defecto → "Next"
5. **Selecciona el editor por defecto**:
   - Puedes elegir "Use Visual Studio Code as Git's default editor" si tienes VS Code
   - O dejar "Nano editor" → "Next"
6. **Ajusta el nombre de la rama inicial**:
   - Deja "Let Git decide" (recomendado) → "Next"
7. **Ajusta tu PATH**:
   - Selecciona **"Git from the command line and also from 3rd-party software"** (recomendado) → "Next"
8. **Selecciona el servidor HTTPS**:
   - Deja "Use the OpenSSL library" → "Next"
9. **Configura los finales de línea**:
   - Selecciona **"Checkout Windows-style, commit Unix-style line endings"** → "Next"
10. **Configura el emulador de terminal**:
    - Selecciona **"Use MinTTY (the default terminal of MSYS2)"** → "Next"
11. **Configura el comportamiento por defecto de 'git pull'**:
    - Deja "Default (fast-forward or merge)" → "Next"
12. **Configura Credential Helper**:
    - Deja "Git Credential Manager" → "Next"
13. **Configura opciones adicionales**:
    - Deja marcadas las opciones por defecto → "Next"
14. **Configura opciones experimentales**:
    - Puedes dejar sin marcar → "Install"
15. **Espera a que termine la instalación** → "Finish"

### Paso 3: Verificar la Instalación
1. **Cierra y vuelve a abrir PowerShell** (o cualquier terminal)
2. Ejecuta:
   ```bash
   git --version
   ```
3. Deberías ver algo como: `git version 2.43.0.windows.1`

### Paso 4: Configurar Git (Primera vez)
Configura tu nombre y email (importante para los commits):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

**Ejemplo:**
```bash
git config --global user.name "Juan Nazareno"
git config --global user.email "jnazareno@ejemplo.com"
```

### Paso 5: Verificar la Configuración
```bash
git config --list
```

## Método 2: Usando Winget (Windows Package Manager)

Si tienes Windows 10/11 con Winget instalado:

```powershell
winget install --id Git.Git -e --source winget
```

## Método 3: Usando Chocolatey

Si tienes Chocolatey instalado:

```powershell
choco install git
```

## Verificar que Git Funciona

Después de instalar, verifica que todo funciona:

```bash
# Ver la versión
git --version

# Ver la configuración
git config --list

# Ver ayuda
git help
```

## Usar Git en tu Proyecto

Una vez instalado Git, puedes inicializar tu proyecto:

```bash
cd C:\Users\jnazareno\Desktop\Cursor

# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Crear el primer commit (checkpoint)
git commit -m "Checkpoint inicial: Sistema de Gestión de Socios v1.0.0"

# Ver el estado
git status

# Ver el historial
git log
```

## Solución de Problemas

### Git no se reconoce después de instalar
1. **Cierra y vuelve a abrir** PowerShell/CMD
2. Si aún no funciona, reinicia tu computadora
3. Verifica que Git esté en el PATH:
   - Busca "Variables de entorno" en el menú de inicio
   - Verifica que `C:\Program Files\Git\cmd` esté en el PATH

### Error de permisos
- Ejecuta PowerShell como administrador si es necesario
- O ajusta la política de ejecución:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

## Recursos Adicionales

- **Documentación oficial**: https://git-scm.com/doc
- **Tutorial interactivo**: https://learngitbranching.js.org/
- **GitHub Guides**: https://guides.github.com/

---

**¡Una vez instalado Git, podrás crear checkpoints profesionales de tu proyecto!**

