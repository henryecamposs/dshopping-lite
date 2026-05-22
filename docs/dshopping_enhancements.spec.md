# Mejoras de Facturación, Exportación y Divisas — Especificación Técnica

Este documento especifica los requisitos técnicos, las reglas de negocio y los contratos de datos para la implementación de las siguientes mejoras en **dCompras Lite**:
1. Exportación robusta a Excel (`xlsx`) y PDF (`jspdf`, `jspdf-autotable`).
2. Integración de SweetAlert2 para notificaciones y confirmaciones interactivas premium.
3. Botones de acción avanzados (Imprimir, Editar, Eliminar) en la gestión de facturas.
4. Actualizador de tasa cambiaria Bolívar/Dólar integrado con una API pública.

---

## 1. Contexto y Objetivo
El objetivo es transformar el módulo de facturación de dCompras Lite en una solución premium e intuitiva. Esto incluye reemplazar alertas del navegador y archivos CSV planos por integraciones modernas, agregando soporte completo para la edición de facturas existentes (antes inexistente) y la consulta automatizada del tipo de cambio oficial de Venezuela (BCV).

---

## 2. Reglas de Negocio

- **RN-EXP-01: Exportación a Excel**: El reporte financiero filtrado debe ser generado como una hoja de cálculo nativa (`.xlsx`) respetando tipos de datos numéricos y de fecha, en lugar de un archivo CSV plano.
- **RN-EXP-02: Exportación a PDF**: Los reportes deben generarse en PDF con un formato ejecutivo tabular limpio, cabecera de la empresa, RIF, totales globales de facturas y equivalencia a moneda local (Bs.) según la tasa actual.
- **RN-SWE-01: Confirmaciones Premium**: Cualquier acción transaccional destructiva o de cambio de estado (eliminar factura, marcar como pagada, actualizar tasa) debe solicitar confirmación a través de modales de SweetAlert2 con estilos adaptativos para el tema claro/oscuro.
- **RN-INV-01: Edición Completa**: Al editar una factura, los cálculos de fecha de vencimiento y de importes (subtotal, IVA, total USD, total Bs.) deben recalcularse en tiempo real de la misma manera que al crear.
- **RN-INV-02: Formato de Impresión de Factura**: El botón "Imprimir" en cada fila de factura debe generar un recibo PDF premium en tamaño carta de manera inmediata con los datos detallados del proveedor, factura, control, base imponible, base exenta, IVA, total USD y total Bs. aplicando la tasa de la factura.
- **RN-EXC-01: Sincronización Cambiaria**: El actualizador de divisas debe ofrecer un botón para consultar automáticamente la tasa oficial del día desde una API pública confiable (`https://ve.dolarapi.com/v1/dolares/oficial`). Si la consulta tiene éxito, actualizará el campo de tasa en la base de datos de la empresa en Supabase mediante un Upsert y notificará con SweetAlert2.

---

## 3. Contratos de Datos (TypeScript)

Se modificará el store de facturas para incluir la acción de actualizar y el store de cambio para la tasa en línea:

```typescript
// src/store/invoiceStore.ts
export interface InvoiceState {
  // ... (estado existente)
  
  // Nueva Acción de Edición
  updateInvoice: (
    invoiceId: string, 
    invoiceData: Partial<Omit<Invoice, 'id' | 'created_at' | 'sub_total' | 'iva_amount' | 'total_invoice' | 'due_date' | 'provider_name'>>
  ) => Promise<{ success: boolean; data?: Invoice; error?: string }>;
}

// src/store/exchangeStore.ts
export interface ExchangeState {
  // ... (estado existente)
  
  // Nueva utilidad de consulta de tasa
  fetchLiveBCVRate: () => Promise<{ success: boolean; rate?: number; error?: string }>;
}
```

---

## 4. Endpoints y Consultas de Backend (Supabase)

No se requieren nuevos endpoints en backend, ya que la base de datos ya cuenta con las políticas RLS y tablas necesarias. La actualización y eliminación interactúan directamente con la base de datos:
- `invoices`: `UPDATE` y `DELETE` filtrados por `company_id`.
- `exchange_rates`: `UPSERT` en conflicto con `company_id, date` para registrar la tasa diaria.

---

## 5. Componentes Frontend y Estado

### Componentes a Modificar / Crear

| Componente | Props | Estado | Descripción |
|------------|-------|--------|-------------|
| `Layout.tsx` | N/A | `isFetchingRate: boolean` | Añade el botón "Obtener BCV" al lado de la edición manual de tasa. |
| `Invoices.tsx` | N/A | `invoiceToEdit: Invoice \| null` | Agrega los botones de acción Imprimir, Editar, Eliminar y coordina el flujo. |
| `InvoiceForm.tsx` | `invoiceToEdit?: Invoice \| null`, `onSuccess: () => void`, `onCancel: () => void` | `formData` y cálculos en tiempo real | Modificado para rellenarse con la factura seleccionada cuando se edita. |
| `Reports.tsx` | N/A | `isExporting: boolean` | Reemplaza exportaciones CSV por XLSX nativo y PDF mediante jsPDF. |

---

## 6. Flujo de Usuario (UX)

### Flujo de Edición:
1. El usuario hace clic en el botón **Editar** de una factura en `Invoices.tsx`.
2. Se despliega el formulario `InvoiceForm` en modo edición pre-rellenado con la información existente.
3. El usuario ajusta los importes y los cálculos en pantalla se actualizan dinámicamente.
4. Al guardar, se ejecuta `updateInvoice`, se refresca la vista y un aviso SweetAlert2 indica éxito.

### Flujo de Consulta de Tasa:
1. El usuario hace clic en **Obtener BCV** en la barra superior.
2. Se muestra un indicador de carga animado.
3. Se obtiene el valor promedio de la tasa oficial del día de la API y se actualiza el store e input global.
4. Un SweetAlert2 Toast de tipo éxito confirma la tasa obtenida.

---

## 7. Criterios de Aceptación

- [ ] **CA-01**: Las exportaciones a Excel generan un archivo `.xlsx` legible por Microsoft Excel / Google Sheets con los filtros activos.
- [ ] **CA-02**: Las exportaciones a PDF de reportes tabulan todas las columnas de forma legible y alineada usando `jspdf-autotable`.
- [ ] **CA-03**: La impresión individual genera un documento de una sola página con formato de factura ejecutiva limpia.
- [ ] **CA-04**: SweetAlert2 sustituye el 100% de los `window.confirm` y `alert` tradicionales con un diseño unificado y premium.
- [ ] **CA-05**: El flujo de edición permite modificar cualquier campo de la factura y recalcula en memoria antes de persistir.
- [ ] **CA-06**: La consulta de tasa del BCV recupera el tipo de cambio oficial del día de forma asíncrona sin bloquear la UI.

---

## 8. Notas y Dependencias

- **xlsx**: Generación de libros de trabajo `.xlsx` nativos en cliente.
- **jspdf** y **jspdf-autotable**: Generación de PDFs y tablas en cliente.
- **sweetalert2**: Modales y alertas de alta interactividad visual.
