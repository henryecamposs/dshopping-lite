---
name: project-brain
description: "Advanced Portable Project Context Manager. Performs deep full-stack analysis (architecture, styles, behavior) to create an onboarding-ready brain for the team and AI agents."
risk: low
source: workspace
---

# Project Brain (Cerebro Fullstack)

Este skill es el núcleo de conocimiento del proyecto. Su objetivo es realizar un **análisis profundo y transversal** de toda la estructura del proyecto (estilos, estructura, arquitectura, contexto funcional, lenguaje y comportamiento) y documentarlo de manera estructurada en la carpeta `.brain/` (o `.antigravity/brain/` según la convención del proyecto).

> **Instrucción Principal:** Cuando el usuario solicite "crear el cerebro" o "actualizar el cerebro", DEBES analizar activamente el código fuente y las configuraciones para extraer el "alma" del proyecto antes de escribir la documentación.

## 1. Fases del Análisis Fullstack (Obligatorio)

Antes de generar o actualizar la documentación, debes inspeccionar (usando `view_file` o `list_dir`):

- **Dependencias y Entorno**: Lee `package.json` para entender el ecosistema (Ej. React 19, Vite, Tailwind, Zustand, React Query, Supabase).
- **Arquitectura de Carpetas**: Analiza la estructura de `src/` (Módulos vs Componentes compartidos).
- **Estilos y UI/UX**: Revisa `tailwind.config.ts`, `index.css`, y `src/components/ui/` para documentar la paleta de colores (dark theme, glassmorphism), tipografía, animaciones y uso de `shadcn/ui`.
- **Estado y Comportamiento**: Inspecciona `src/stores/` (Zustand) y `src/hooks/queries/` (React Query) para entender cómo fluyen los datos y cómo se maneja el estado global y asíncrono.
- **Contexto de Negocio**: Identifica entidades principales (Ej. Juegos, Sorteos, Usuarios, Organizaciones) leyendo los servicios o modelos.

## 2. Estructura del Cerebro (`.brain/`)

Basado en el análisis, debes crear o mantener rigurosamente la siguiente estructura de archivos en la raíz del proyecto. **NO escribas resúmenes vagos; extrae ejemplos de código, convenciones de nombres y reglas arquitectónicas.**

### 📁 `.brain/knowledge/` (El Core del Proyecto)
- `architecture.md`: Paradigmas (Ej. Arquitectura Modular por features), stack tecnológico detallado, patrones de routing, y estructura de directorios.
- `styles_and_ui.md`: Guía de estilos. Colores principales, estrategias de Dark Mode, uso de Tailwind, reglas de accesibilidad y animaciones estándar.
- `state_and_behavior.md`: Estrategia de manejo de estado (estado del servidor vs estado del cliente), manejo de errores (Error Boundaries, Toasts), y logging.
- `domain_context.md`: Reglas de negocio, entidades principales, diccionarios de términos (Ej. qué es un "Sorteo", un "Pleno", "Tickets").

### 📁 `.brain/history/` (Evolución)
- `decision_log.md`: (ADR - Architecture Decision Records). Log cronológico de hitos técnicos (Ej. "Se migró de Redux a Zustand por rendimiento").

### 📁 `.brain/tasks/` (Alineación)
- `roadmap.md`: Deuda técnica identificada, próximas implementaciones mayores y objetivos a corto/largo plazo.

## 3. Reglas de Mantenimiento

1.  **Portabilidad Máxima**: Todo lo generado debe ser agnóstico a la máquina. Estos archivos se versionan en Git para que cualquier desarrollador (u otro agente de IA) adquiera contexto instantáneo al clonar el repositorio.
2.  **Auto-Descubrimiento**: Si encuentras código legado ("require") vs moderno ("import"), documéntalo como deuda técnica o estándar de migración.
3.  **Proactividad**: Si implementas una refactorización mayor (Ej. cambiar la forma de autenticación), invoca las reglas de este skill mentalmente y actualiza `decision_log.md` automáticamente de ser posible.

## Ejemplo de Ejecución

Si el usuario dice: _"usa la habilidad de cerebro para crear el cerebro de la aplicacion"_, tu respuesta debe ser:
1.  Activar modo de **EXECUTION**.
2.  Inspeccionar proactivamente `package.json`, `index.css`, `src/modules/` y componentes clave.
3.  Crear la carpeta `.brain/` (si no existe) y generar/sobrescribir los archivos markdown definidos arriba con información rica, específica y real extraída del código fuente.
4.  Avisar al usuario que el cerebro ha sido compilado.
