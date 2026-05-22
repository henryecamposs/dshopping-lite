# Especificación Técnica: Sincronización y Actualización Dinámica de Tasa Bolívar/Dólar (Bs/$)

Este documento especifica los requisitos técnicos, las reglas de negocio y los cambios necesarios para que todas las operaciones y cálculos en bolívares (Bs.) se actualicen dinámicamente según la tasa de cambio del día, propagando los cambios reactivamente tanto en la base de datos como en la interfaz de usuario.

---

## 1. Contexto y Objetivo
El usuario requiere que cualquier visualización o reporte de facturas y balances en bolívares (moneda local) muestre montos calculados con la tasa del día actualizada. Al cambiar la tasa (ya sea manualmente o vía BCV), todos los importes en bolívares en la base de datos (mediante la tasa registrada `exchange_rate_at_invoice`) deben actualizarse de acuerdo a los montos en USD. Además, esto debe verse reflejado en caliente en la UI de inmediato.

---

## 2. Reglas de Negocio

- **RN-LIVE-01: Cálculo de Bs. en Tiempo Real**: Todas las vistas de la aplicación (Dashboard, Facturas, Reportes) que calculen y muestren montos en Bolívares (Bs.) deben utilizar de manera activa la tasa de cambio del día actual (`useExchangeStore.currentRate?.rate_value`) si está disponible. Si no está disponible, se utilizará de respaldo la tasa registrada en la factura (`exchange_rate_at_invoice`).
- **RN-LIVE-02: Actualización Masiva en Base de Datos**: Al modificarse la tasa cambiaria diaria (manualmente en la UI o de forma automática mediante la integración del BCV), se debe ejecutar una consulta de actualización (`UPDATE`) en Supabase para cambiar el valor de `exchange_rate_at_invoice` de todas las facturas correspondientes a la empresa activa (`company_id`) al valor de la nueva tasa cambiaria del día.
- **RN-LIVE-03: Sincronización Reactiva de Memoria (Zustand)**: Inmediatamente después de actualizar las facturas en Supabase, el store de facturas (`useInvoiceStore`) debe actualizar su estado local en memoria, mapeando todas las facturas y modificando su `exchange_rate_at_invoice` al valor de la nueva tasa cambiaria. Esto propagará automáticamente el cambio a todos los componentes de React que escuchan al store.
- **RN-LIVE-04: Consistencia en Exportaciones y PDF**:
  - Las exportaciones a Excel (CSV) en la vista de reportes deben calcular los bolívares con la tasa actualizada del día.
  - La generación de PDF e impresión individual de factura debe utilizar la tasa de cambio actualizada en todos los cálculos tabulares y totales.
  - La impresión de reportes de balances debe utilizar la tasa cambiaria actualizada para la cabecera y el detalle de cada factura.

---

## 3. Contratos de Datos y Flujo de Estado (Zustand)

Al actualizar la tasa en `useExchangeStore.updateCurrentRate`, se coordinará la actualización del store local de facturas (`useInvoiceStore`):

```typescript
// En src/store/exchangeStore.ts
import { useInvoiceStore } from './invoiceStore';

// Dentro de updateCurrentRate(companyId, rateValue):
// 1. Actualizar tasa en Supabase (exchange_rates)
// 2. Actualizar exchange_rate_at_invoice en la tabla 'invoices' de Supabase:
const { error: invoicesError } = await supabase
  .from('invoices')
  .update({ exchange_rate_at_invoice: rateValue })
  .eq('company_id', companyId);

// 3. Sincronizar en caliente en el estado global de Zustand para re-renderizado reactivo inmediato:
useInvoiceStore.setState((state) => ({
  invoices: state.invoices.map((inv) => ({
    ...inv,
    exchange_rate_at_invoice: rateValue
  }))
}));
```

---

## 4. Archivos a Modificar

### 1. [exchangeStore.ts](file:///c:/Users/DELL/Documents/dPana%20Projects/dPana%20Compras/src/store/exchangeStore.ts)
- Modificar `updateCurrentRate` para incluir la actualización de la tabla `invoices` en Supabase y actualizar el estado en memoria de `useInvoiceStore`.

### 2. [Dashboard.tsx](file:///c:/Users/DELL/Documents/dPana%20Projects/dPana%20Compras/src/views/Dashboard.tsx)
- Actualizar todas las filas de la tabla de facturas pendientes críticas, vencen hoy y vencen mañana para calcular los bolívares utilizando la tasa activa (`currentRate?.rate_value`) de forma reactiva.

### 3. [Invoices.tsx](file:///c:/Users/DELL/Documents/dPana%20Projects/dPana%20Compras/src/views/Invoices.tsx)
- Cambiar el cálculo del importe en Bs. de la tabla de facturas de `total_invoice * exchange_rate_at_invoice` a `total_invoice * (currentRate?.rate_value || exchange_rate_at_invoice)`.
- Modificar `handlePrintSingleInvoice` para calcular los bolívares basándose en la tasa de cambio activa.

### 4. [Reports.tsx](file:///c:/Users/DELL/Documents/dPana%20Projects/dPana%20Compras/src/views/Reports.tsx)
- Ajustar los totales de balances y totales equivalentes en Bs. para reflejar los montos bajo la tasa del día de forma reactiva.
- Ajustar la tabla de registros de reportes para que el campo de bolívares y la exportación de Excel utilicen la tasa cambiaria del día.

---

## 5. Plan de Verificación

### Pruebas Manuales
1. **Actualización de Tasa Manual**: Cambiar la tasa cambiaria en la barra superior. Verificar que todas las facturas en la tabla de facturas, dashboard y reportes cambien sus importes en bolívares instantáneamente sin refrescar la página.
2. **Actualización vía BCV**: Hacer clic en "Obtener BCV" y constatar que al actualizar la tasa promedio oficial del día se actualicen tanto la base de datos como las vistas de inmediato.
3. **Persistencia en Base de Datos**: Verificar directamente en la consola de Supabase o recargando la página que el campo `exchange_rate_at_invoice` de todas las facturas de la empresa se ha actualizado.
4. **Impresión PDF y Excel**: Exportar el reporte a Excel o imprimir una factura individual y certificar que los montos en Bs. mostrados coincidan con la nueva tasa de cambio.

### Pruebas Automatizadas
- Ejecutar `npm run build` en la consola para asegurar que no haya errores de compilación de TypeScript.
