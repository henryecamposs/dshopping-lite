# Especificación Técnica: Sistema de Exportación Multipropósito y Vista Previa HTML de Impresión

Este documento especifica las reglas de negocio, los contratos de datos y la arquitectura técnica para la implementación del popup de exportación (PDF / Excel) de facturas y proveedores, y el sistema de vista previa HTML previo a la impresión.

---

## 1. Reglas de Negocio

- **RN-EXP-01: Popup de Exportación Unificado**:
  - En la vista de Facturas (`Invoices.tsx`) y Proveedores (`Providers.tsx`), se debe incluir un botón de "Exportar Datos" que abra un popup modal interactivo y estilizado.
  - El popup debe ofrecer opciones claras para exportar la lista filtrada o seleccionada actual en dos formatos:
    - **PDF Ejecutivo**: Utilizando `jsPDF` y `jsPDF-autotable` para generar un reporte tabular altamente estructurado, con paginación, totales consolidados (para facturas) y membrete de marca de **dShopping**.
    - **Excel Real (Binary .xlsx)**: Utilizando la librería `xlsx` (SheetJS) para generar un libro binario Excel nativo de alta fidelidad, con columnas autoajustadas y tipos de datos correctos (no CSV plano).
  
- **RN-EXP-02: Vista Previa HTML antes de Imprimir**:
  - Al presionar "Imprimir" en una factura individual (o en un reporte consolidado), la aplicación NO enviará el documento directamente a la impresora ni abrirá un PDF vacío en otra pestaña.
  - En su lugar, se presentará un modal de **Vista Previa de Impresión HTML** de pantalla completa o tipo popup premium.
  - Este modal renderizará un documento HTML de alta fidelidad (estilizado con el tema OKLCH violeta, lavanda, esmeralda y ámbar) que emula de forma exacta el comprobante fiscal, conteniendo la base imponible, exenta, desglose de IVA, equivalencia en bolívares calculada con la tasa activa del día, y datos del proveedor.
  - Dentro de la vista previa, se dispondrá de un botón destacado de **"Imprimir Documento"** y un botón de **"Cerrar Previa"**.
  - Al hacer clic en "Imprimir Documento", se ejecutará la impresión física nativa de esa porción HTML (aislando el layout de la vista previa mediante CSS `@media print` o imprimiendo la ventana/iframe adaptado).

- **RN-EXP-03: Exportación de PDF Individual desde Vista Previa**:
  - En el modal de vista previa (`PrintPreviewModal.tsx`), se añadirá un botón para exportar el comprobante actual a PDF de forma directa.
  - Este archivo se generará localmente en formato Carta (Letter) con un diseño corporativo premium, incorporando los datos fiscales del emisor y del proveedor beneficiario, detalles operativos, una tabla estructurada de importes (utilizando `jspdf-autotable`) y una caja destacada con la conversión cambiaria en bolívares calculada con la tasa activa.
  - La descarga del archivo será inmediata y no disparará el diálogo nativo de impresión del navegador.

---

## 2. Contratos de Datos y Tipado TypeScript

Definiremos los contratos para las opciones de exportación y estados del modal en un archivo de tipos compartido:

```typescript
// Opciones para la exportación de reportes tabulares
export interface ExportOptions {
  format: 'pdf' | 'xlsx';
  scope: 'all' | 'filtered' | 'selected';
  includeSummary?: boolean; // Solo para facturas (totales de balances)
}

// Estado para el modal de vista previa de impresión HTML
export interface PrintPreviewState {
  isOpen: boolean;
  documentType: 'invoice' | 'provider_list' | 'invoice_report';
  data: any; // Datos de la factura o listado a previsualizar
}
```

---

## 3. Endpoints de Backend
Esta funcionalidad es de carácter 100% frontend, procesando los datos en caliente del lado del cliente utilizando la sincronización del store Zustand (`useInvoiceStore` y `useExchangeStore`). No se requieren endpoints adicionales del backend de Supabase.

---

## 4. Componentes de Frontend y su Estado

### A. Componente `ExportModal.tsx` [NEW]
Un modal emergente estilizado para elegir el formato de descarga (PDF con `jsPDF` / Excel con `xlsx` / CSV).
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `dataType: 'invoices' | 'providers'`
  - `data: any[]` (Registros activos a exportar)
- **Estado Interno**:
  - `format: 'pdf' | 'xlsx'`
  - `scope: 'all' | 'filtered'`

### B. Componente `PrintPreviewModal.tsx` [NEW]
Un modal premium que emula una hoja de papel física en formato digital (A4 / Letter), estructurando un comprobante de alta fidelidad.
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `invoice: Invoice | null` (Factura actual a previsualizar)
  - `providers: Provider[]` (Listado de proveedores para resolver la información del emisor)
- **Funcionalidades**:
  - **Imprimir Documento**: Ejecuta `window.print()` aislando el comprobante con directivas `@media print`.
  - **Exportar PDF**: Genera y descarga un comprobante PDF Letter de alta fidelidad de manera local con la tasa de cambio activa.
- **Estilos**: Utiliza las variables OKLCH (`bg-muted/15`, `text-text-main`, `border-primary/20`) con animaciones suaves de entrada. Para la impresión nativa, incluye clases `@media print` dedicadas que ocultan el resto de la aplicación y expanden la hoja HTML a pantalla completa para el diálogo físico.

---

## 5. Plan de Verificación de QA

1. **Popup de Exportación**:
   - Abrir el modal de exportación en la tabla de facturas. Seleccionar "Excel (.xlsx)". Verificar la descarga del archivo binario nativo y abrirlo en Excel para certificar su estructura.
   - Seleccionar "PDF". Verificar la generación de la tabla formateada mediante `jspdf-autotable`.
   - Repetir el proceso en la vista de proveedores.
   
2. **Vista Previa de Impresión**:
   - Hacer clic en "Imprimir" en una factura de la tabla de facturas.
   - Constatar que se despliega el modal interactivo con el diseño exacto del comprobante.
   - Validar que los montos en bolívares equivalentes utilicen dinámicamente la tasa activa del día.
   - Presionar "Imprimir Documento" dentro de la vista previa y verificar que el diálogo nativo de impresión del sistema operativo renderice la factura perfectamente aislada de la barra lateral, botones y bordes del modal.
