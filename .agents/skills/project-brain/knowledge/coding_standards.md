# TypeScript & Coding Standards

Estándares de codificación seguidos en el proyecto R4 Conecta API.

## Configuraciones Base
- **Runtime**: Node.js con TypeScript.
- **Compilación**: Target `ES2022`, Module `CommonJS`.
- **Modo Estricto**: Habilitado para máxima seguridad de tipos.

## Estándares de Código

### 1. Tipado
- Uso extensivo de interfaces y tipos para definir contratos de API (`src/types/`).
- Evitar el uso de `any` siempre que sea posible (priorizar genéricos).

### 2. Validación de Datos
- **Zod**: Todas las entradas de la API deben ser validadas utilizando schemas de Zod en la capa de controladores.
- Ubicación: `src/validators/`.

### 3. Manejo de Errores
- Uso de `asyncHandler` o bloques `try-catch` consistentes en controladores.
- Respuestas estandarizadas con `code`, `message` y `success`.

### 4. Logging
- **Winston**: Cada solicitud y respuesta significativa debe ser logueada con contexto (endpoint, status, timestamps).
- Niveles: `info` para flujo normal, `warn` para fallos no críticos, `error` para excepciones.

### 5. Estilo de Importaciones
- Importaciones organizadas: Node built-ins -> Third party -> Local modules.
- Uso de alias o rutas relativas según la configuración.
