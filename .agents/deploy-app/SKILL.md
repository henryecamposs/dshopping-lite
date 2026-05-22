---
name: deploy-app
description: Orquestador agnóstico de compilación, sincronización de ramas Git (main y prod) y despliegue a producción en el remoto origin.
---

# Deploy App Skill (Orquestador de Despliegue Genérico)

Este skill automatiza y reglamenta el proceso que un agente **DEBE** seguir para compilar, sincronizar ramas de control en Git (`main` y `prod` en el remoto `origin`) y realizar despliegues en caliente de forma segura para cualquier aplicación web SPA o estática.

---

## Flujo Operativo Estricto para el Agente

### 1. Validación de Pre-vuelo (Obligatorio)
Antes de realizar cualquier cambio en el historial de Git, el agente debe garantizar que el estado actual de la aplicación compila perfectamente y cumple los estándares del proyecto.
*   **Comando sugerido**: `npm run build` o `npm run lint` (según se configure en el proyecto).
*   **Regla de Bloqueo**: Si hay errores de compilación o análisis estático, el agente **DEBE** corregirlos antes de proceder con el despliegue.

### 2. Configuración y Parámetros Operativos
El agente debe inspeccionar si en la raíz del proyecto existe un archivo de configuración `deploy.config.json`.
*   Si existe: Utilizar los nombres de rama (`branches.dev`, `branches.prod`), remoto (`remote`), y comandos de compilación y despliegue configurados allí.
*   Si no existe: Asumir por defecto la rama de desarrollo `main`, la rama de producción `prod`, el servidor remoto `origin`, y el compilado en la carpeta `dist/`.

### 3. Historial de Cambios (Changelog)
Antes del commit de despliegue, el agente debe verificar que las nuevas características, refactorizaciones y correcciones del día estén descritas en el archivo `CHANGELOG.md` siguiendo el estándar *Keep a Changelog*.

### 4. Sincronización y Fusión en Origin (Rama de Desarrollo)
Sincronizar los últimos commits del desarrollo local con el repositorio remoto.
*   **Paso 1**: Asegurar que está posicionado en la rama de desarrollo (ej. `main`).
*   **Paso 2**: Empujar commits locales al remoto:
    ```bash
    git push origin main
    ```

### 5. Despliegue de Producción (Rama de Producción)
Llevar a cabo la integración y el despliegue físico.
*   **Paso 1**: Cambiar a la rama de producción estable:
    ```bash
    git checkout prod
    ```
*   **Paso 2**: Asegurar sincronía con cambios remotos previos:
    ```bash
    git pull origin prod
    ```
*   **Paso 3**: Mezclar de forma limpia el desarrollo consolidado en producción:
    ```bash
    git merge main -m "merge: fusionar avances del ciclo de desarrollo en la rama de produccion de forma automatizada"
    ```
*   **Paso 4**: Empujar los cambios a producción al servidor central:
    ```bash
    git push origin prod
    ```
*   **Paso 5 (Despliegue)**: Ejecutar el comando de compilación (`npm run build` o el configurado en `deploy.config.json`) y el comando de subida a hosting (ej. `npx wrangler pages deploy dist`, `firebase deploy` o invocando el script interactivo local `.\scripts\deploy.ps1`).

### 6. Restauración del Espacio de Trabajo
Por seguridad del flujo de desarrollo, el agente **SIEMPRE** debe regresar a la rama de trabajo principal al finalizar el turno:
```bash
git checkout main
```

---

## Reglas de Oro para el Agente
1.  **Cero Tolerancia a Fallos**: NUNCA fusiones ni empujes cambios a la rama `prod` si el comando de compilación local falla.
2.  **Sincronización Transparente**: Asegúrate de que el remoto `origin` tenga siempre la última versión de ambas ramas para evitar bifurcaciones huérfanas.
3.  **Persistencia del Estado**: Siempre finaliza tu turno reportando al usuario el estado del despliegue (Éxito / Fallo) y la URL asignada por el proveedor.
4.  **No Interrupción**: Utilice los scripts locales provistos (`deploy.ps1`) para sortear restricciones de entornos sandboxed donde no sea posible realizar autenticaciones OAuth web automáticas.
