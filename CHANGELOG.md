# Changelog (Historial de Cambios) - dShopping Lite

Este archivo registra cronológicamente todas las actualizaciones, mejoras, correcciones de errores y nuevas características implementadas en **dShopping Lite**. El formato de este registro se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y se adhiere a [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-05-22
### Añadido
- **Módulo de Gastos Operativos**: Tabla dedicada `expenses` en base de datos Supabase con RLS. KPIs financieros contables, filtros avanzados y modal premium de registro con validación cambiaria obligatoria.
- **Centro de Reportes Consolidados**: Estructuración del panel de reportes en pestañas (Tabs) unificadas para Facturas de Compras, Histórico de Pagos de Proveedores y Retenciones IVA/ISLR oficiales del SENIAT con exportación CSV específica.
- **Habladores de Precios Premium**: Rediseño de grilla con glassmorphism interactivo y maquetación de impresión horizontal de 2 columnas con doble borde negro clásico de alta definición y membrete de empresa.
- **Planificación de Turnos Persistente**: Store Zustand `shiftStore.ts` y tabla `staff_shifts` en Supabase. CRUD de guardias semanal, modal flotante de asignación y hoja de guardias horizontal formateada con rango de fechas dinámico.
- **Menú de Navegación Organizado**: Creación de la categoría destacada `REPORTES` en `Layout.tsx` y ordenamiento lógico de todos los módulos.

### Corregido
- **Edición de Datos Bancarios**: Habilitado el flujo de edición y actualización interactiva de las formas de pago de proveedores (`bank_accounts` JSONB) en el modal correspondiente de proveedores.
- **Desbloqueo de Referencia en Gastos**: El campo de referencia de pago para registrar gastos se desbloqueó (permite edición para cualquier método, incluyendo efectivo) y ahora acepta caracteres alfanuméricos (letras y números) para transferencias internacionales y Zelle.

## [1.1.1] - 2026-05-22
### Añadido
- **Vista Previa de Impresión HTML**: Se incorporó el modal premium `PrintPreviewModal.tsx` que emula digitalmente una hoja física de papel tamaño Carta (Letter).
- **Aislamiento de Impresión Nativa**: Estilos CSS `@media print` dedicados para ocultar de forma atómica sidebars, modales traseros y botones de acción al presionar "Imprimir Documento" (`window.print()`).
- **Barra de Desplazamiento Personalizada**: Scroll elástico vertical `.custom-scrollbar` con riel violeta traslúcido para una navegación premium e inclusiva de facturas extensas en pantallas compactas.
- **Exportador PDF Individual**: Botón para descargar un comprobante PDF Letter directamente desde la vista previa de impresión HTML, con membrete corporativo, desglose contable e indicador destacado de conversión a bolívares (Bs.) en cliente utilizando `jspdf-autotable`.

### Corregido
- **Alineación de Scroll en Diálogo**: Se corrigió el recorte de contenido (*clipping*) en la vista previa del documento para permitir scroll suave e ilimitado dentro del contenedor del modal.

---

## [1.1.0] - 2026-05-22
### Añadido
- **Exportador Multipropósito (`ExportModal.tsx`)**: Nueva interfaz interactiva para exportar registros financieros seleccionados o filtrados.
- **Generador de Excel Nativo (.xlsx)**: Integración con la librería `xlsx` (SheetJS) para generar libros binarios reales con cabeceras formateadas y autoajuste del ancho de columnas en caliente.
- **Reporte PDF Consolidado**: Configuración horizontal tabular para listados masivos mediante `jsPDF` y `jspdf-autotable`, incluyendo sumatoria de balances contables y membrete.
- **Confirmaciones Interactivas con SweetAlert2**: Sustitución completa de las alertas del navegador (`window.confirm` / `alert`) por diálogos y notificaciones toast animados con soporte adaptativo para temas.

---

## [1.0.5] - 2026-05-21
### Añadido
- **Bolívar Live Sync (BCV)**: Conexión con la API pública de `ve.dolarapi.com` para obtener el tipo de cambio oficial del Bolívar (USD/Bs.) en tiempo real con un solo clic.
- **Actualización Masiva Reactiva**: Propagación automática de la tasa cambiaria diaria. Al cambiar la tasa, el sistema ejecuta un `UPDATE` masivo en Supabase para el campo `exchange_rate_at_invoice` de todas las facturas de la empresa activa y re-calcula las equivalencias locales en caliente en la UI vía Zustand (`useExchangeStore` y `useInvoiceStore`).

---

## [1.0.0] - 2026-05-20
### Añadido
- **Lanzamiento Inicial**: Estructuración del núcleo financiero de la aplicación SPA reactiva.
- **Base de Datos Supabase**: Configuración de tablas (`companies`, `users`, `providers`, `invoices`) y políticas RLS robustas validadas a nivel de fila mediante funciones PL/pgSQL.
- **Zustand State Engine**: Stores ligeros y centralizados para sesión de usuario (`authStore`), facturación (`invoiceStore`) e historial de tasas manuales (`exchangeStore`).
- **Diseño Estético OKLCH**: Paleta cromática corporativa violeta, lavanda, esmeralda y el botón principal `.btn-primary` en amarillo brillante (`#facc15` / `yellow-400`) para cumplir el contraste WCAG AA.
