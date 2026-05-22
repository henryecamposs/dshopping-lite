# R4 Conecta API Architecture

Este documento describe la arquitectura técnica del proyecto R4 Conecta API, una plataforma de integración bancaria.

## Resumen del Sistema
R4 Conecta actúa como un middleware entre aplicaciones de comercio y el core bancario R4, facilitando operaciones como Pagos Móviles (C2P), Transferencias, Vueltos y Consultas de Tasa BCV.

## Componentes Principales

### 1. Entry Point (`src/server.ts`)
- **Validación de Licencia**: Verifica que el hash de la licencia sea válido antes de iniciar.
- **Consulta Inicial**: Realiza una consulta inicial de la tasa BCV para verificar conectividad.
- **Server Initialization**: Inicia el servidor Express en el puerto configurado.
- **Graceful Shutdown**: Maneja señales `SIGTERM` y `SIGINT` para un cierre limpio.

### 2. Aplicación Express (`src/app.ts`)
- **Seguridad**: Implementa `helmet`, `cors` y `express-rate-limit`.
- **Middlewares**:
    - `licenseMiddleware`: Valida el token de acceso para endpoints de la API.
    - `ipWhitelistMiddleware`: Restringe el acceso a webhooks de notificación.
    - `errorHandler`: Captura errores globales y devuelve respuestas estandarizadas.
- **Routing**: Organizado modularmente por servicios bancarios.

### 3. Servicios (`src/services/r4.service.ts`)
- Es el núcleo de la comunicación con el api central de R4.
- **Autenticación**: Genera firmas HMAC-SHA256 para cada solicitud basándose en los campos específicos requeridos por cada endpoint.
- **Comunicación**: Utiliza `fetch` para realizar solicitudes POST autenticadas.

### 4. Capa de Presentación (Views)
- Utiliza **EJS** para renderizar dashboards de monitoreo y simulación.
- **Estilo Visual**: Dark Theme premium con Tailwind CSS, glassmorphism y Bootstrap Icons.

## Flujo de una Solicitud
1. El cliente envía una solicitud a un endpoint `/api/*`.
2. `licenseMiddleware` valida la autorización.
3. El `controller` correspondiente valida el cuerpo de la solicitud con un schema de `zod`.
4. El `service` genera la firma HMAC y realiza la solicitud al core R4.
5. El resultado se devuelve al cliente de forma estandarizada.
