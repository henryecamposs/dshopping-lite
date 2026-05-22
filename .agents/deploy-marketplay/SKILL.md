---
name: deploy-marketplay
description: Orquestador avanzado de despliegue para La Imaginaria. Gestiona el ciclo completo de Build, Análisis Proactivo de Cerebro (project-brain), y Sincronización multi-remoto (Origin/Marketplay).
---

# Deploy Marketplay (Orquestador Pro)

Este skill automatiza y asegura el proceso de despliegue a producción, garantizando que el código sea estable y que la memoria operativa del sistema esté sincronizada con el estándar de `project-brain`.

## Flujo Operativo Estricto

### 1. Validación Pre-Vuelo (Obligatorio)
Antes de tocar Git, el agente **DEBE** asegurar que el código es válido.
- Comando: `npm run build; npm run lint`
- **Bloqueo**: Si hay errores de compilación o linting, el agente debe corregirlos antes de avanzar.

### 2. Auditoría y Sincronización del Cerebro (project-brain)
Invocación obligatoria del skill `project-brain` para asegurar que el conocimiento del proyecto esté actualizado antes de ser persistido.
- **Acción (Auditoría)**: Ejecutar un análisis proactivo de los cambios realizados en el código. Si se modificaron arquitecturas, modelos de datos (ej. estados de tickets) o estilos, se DEBE actualizar la carpeta `.brain/` (`architecture.md`, `decision_log.md`, etc.).
- **Acción (Memoria)**: Mantener actualizado `MEMORY.md` para un resumen cronológico rápido de hitos.
- **Acción (Versionado)**: El sistema utiliza un formato `X-YYYY`. 
  - **X**: Número de versión principal (solo cambia si el usuario lo autoriza).
  - **YYYY**: Contador de revisiones de 4 dígitos (se incrementa automáticamente en cada despliegue).
- **Acción (DB Sync)**: Se ejecutará `scripts/sync-db-version.ts` para calcular el siguiente release basándose en el historial de la DB y actualizar los campos `version_back` y `release_back` en la tabla `system.settings`.
- **Acción (Changelog)**: Generar el historial de cambios mediante `powershell -ExecutionPolicy Bypass -File scripts/generate-changelog.ps1`, inyectando el release `X-YYYY` generado.
- **Acción (Commit Operativo)**: Realizar el commit usando Conventional Commits (ej. `feat: deployment release 1-0012`).

### 3. Distribución Multi-Remoto (Rama Main)
Sincronización del desarrollo base.
- Comando: `git push origin main; git push marketplay main`

### 4. Despliegue a Producción (Rama Prod)
Este paso desencadena el despliegue automático en Cloud Run.
- **Autorización**: Si no ha sido autorizada previamente por el usuario, preguntar antes de proceder.
- Comando: `git checkout prod; git merge main; git push origin prod; git push marketplay prod; git checkout main`

### 5. Verificación de Estado y Reporte Final
- Comando: `git remote update; git status`
- **Obligatorio**: El agente debe finalizar el turno mostrando un cuadro resumen con:
  - **Estatus**: ✅ EXITOSO
  - **Versión Backend**: vX.X.X
  - **Revisión Backend**: X-YYYY (numeric)

## Reglas de Oro
- **Nunca** desplegar a `prod` si el paso de `build` falló.
- **Siempre** invocar `project-brain` para auditar el estado del proyecto antes de un push.
- **Siempre** utilizar `scripts/deploy.ps1` para el flujo de despliegue a producción.
- **Siempre** regresar a la rama `main` tras finalizar.
- **MEMORIA INMORTAL**: NUNCA borres información histórica de `MEMORY.md` ni de `.brain/`. Los nuevos hitos deben PREPENDERSE (añadirse al inicio). Si ya existe una entrada para el **mismo día**, puedes actualizarla para reflejar los nuevos cambios realizados, pero SIEMPRE preservando y acumulando la información previa de ese día. La historia operativa es sagrada y acumulativa.

## Troubleshooting
Si un push es rechazado por conflictos:
1. `git pull origin main --rebase`
2. Resolver conflictos.
3. Reiniciar el flujo de validación.
