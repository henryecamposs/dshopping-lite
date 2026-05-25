# Changelog (Historial de Cambios) - dShopping Lite

Este archivo registra cronológicamente todas las actualizaciones, mejoras, correcciones de errores y nuevas características implementadas en **dShopping Lite**. El formato de este registro se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y se adhiere a [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-05-25
### Añadido
- **Módulo de Operaciones de Caja, Control de Vales y Cierres**:
  - Tabla `cash_registers` para registrar las cajas físicas del local de forma independiente.
  - Relación `cash_register_id` en la tabla `cash_closures` para asociar cierres de caja a la estación seleccionada.
  - CRUD de Cajas y CRUD de Terminales POS unificados en una pestaña de administración con un **Doble Panel CRUD en Paralelo** interactivo.
  - Conteo de efectivo bimonetario (USD / Bs) y arqueo interactivo por Terminales POS bancarios declarando los importes de cobro con tarjeta.
- **Componente de UI Select Reutilizable y Premium (`Select.tsx`)**:
  - Creación del componente `src/components/ui/Select.tsx` bajo `React.forwardRef` que admite todas las propiedades nativas de HTML y hereda estilos unificados de `.input-premium`.
  - Migración y refactorización de selects nativos a `<Select>` en `CashClosure.tsx`, `InvoiceForm.tsx` y `RetentionForm.tsx` para estandarizar la estética.

### Refactorizado
- **Arquitectura de Desacoplamiento de Supabase**:
  - Extracción de todas las operaciones directas de Supabase a una capa aislada de servicios (`src/services/`) con tipos robustos en TypeScript (ej. `authService.ts`, `invoiceService.ts`, `exchangeService.ts`, etc.).
  - Renombrado de todos los stores Zustand al prefijo estándar `use` (`useAuthStore.ts`, `useInvoiceStore.ts`, etc.) y reescritura de 17 importaciones en cascada por toda la aplicación.

### Corregido
- **Contraste de Selects en Modo Oscuro (Windows/Chrome)**:
  - Inyección de reglas CSS base en `index.css` aplicando `color-scheme: dark !important` y colores obligatorios para `select option` bajo `.dark`, eliminando el problema de visualización con opciones de fondo gris claro y texto blanco nativo.

---

## [1.2.1] - 2026-05-22
### Añadido
- **Datos Bancarios en Ficha de Proveedor**: Visualización directa y compacta de las cuentas bancarias (JSONB) en cada tarjeta del grid de proveedores, con iconos por tipo de cuenta (Zelle, Pago Móvil, Corriente/Ahorro), número enmascarado y botón de copiado rápido al portapapeles con notificación SweetAlert2.
- **Panel de Cuentas en Formulario de Edición**: Sección "Cuentas Bancarias Vinculadas" integrada directamente en el panel Editar Proveedor, con visualización completa de todas las cuentas del proveedor y acceso rápido al modal de gestión sin necesidad de cerrar el formulario.
- **Sincronización Reactiva Bidireccional**: El estado de las cuentas bancarias se actualiza automáticamente en tiempo real tanto en las fichas del grid como en el formulario de edición, al agregar, editar o eliminar cuentas desde el modal `ProviderBankModal`.

### Corregido
- **Visibilidad de Datos Bancarios**: Resuelto el problema donde las cuentas bancarias del proveedor solo eran accesibles vía modal, sin visibilidad directa en la interfaz principal. Ahora son visibles en el punto de contacto principal del proveedor.

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
