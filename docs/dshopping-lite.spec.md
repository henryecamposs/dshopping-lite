# dCompras Lite — Especificación Técnica

Esta especificación técnica detalla los requerimientos, lógica de negocio, contratos de datos de TypeScript, operaciones de base de datos en Supabase y componentes del frontend para **dCompras Lite**, un sistema multi-empresa de gestión de facturas de compras y cuentas por pagar.

---

## 1. Contexto y Objetivo

**dCompras Lite** es una aplicación web moderna diseñada para automatizar y optimizar el registro y control de facturas de compras de múltiples empresas. Facilita la toma de decisiones mediante la visualización de cuentas por pagar en tiempo real, permitiendo la conversión automática de divisas (USD a moneda local, ej. Bs.) en base a una tasa cambiaria configurable diariamente.

---

## 2. Reglas de Negocio (RN)

### RN-01: Aislamiento Multi-Empresa Estricto
- Todos los datos del negocio (`users`, `providers`, `exchange_rates`, `invoices`) deben pertenecer a una empresa (`companies`).
- Los usuarios se registran vinculándose a una empresa existente mediante un código serial único (`serial_code`).
- Cualquier consulta en la aplicación o base de datos debe filtrarse obligatoriamente por el `company_id` del usuario autenticado.

### RN-02: Lógica de Autocalculo de Fechas
- Al ingresar la `Fecha de Factura` (`invoice_date`) y los `Días de Crédito` (`credit_days`), el sistema debe calcular la `Fecha de Vencimiento` (`due_date`) automáticamente:
  $$\text{due\_date} = \text{invoice\_date} + \text{credit\_days}$$
- Si los días de crédito son `0`, la fecha de vencimiento será igual a la fecha de la factura (pago de contado).

### RN-03: Lógica Cambiaria y Conversión Monetaria
- El sistema mantiene una **Tasa del Día** global por empresa.
- Al registrar una factura, se captura el valor actual de la tasa cambiaria (`exchange_rate_at_invoice`).
- El cálculo del **Monto a Pagar en Moneda Local** se obtiene multiplicando la base del total de la factura por la tasa cambiaria:
  $$\text{Monto a Pagar (Bs.)} = \text{total\_invoice (USD)} \times \text{exchange\_rate\_at\_invoice (Bs/\$)}$$
- Los cálculos financieros del frontend deben mostrar ambos montos de forma clara para el operador.

### RN-04: Cálculos Financieros Automáticos en Facturas
- Al ingresar la **Base Imponible** (`base_taxable`) y la **Base Exenta** (`base_exempt`), el sistema calcula:
  $$\text{Subtotal} = \text{base\_taxable} + \text{base\_exempt}$$
  $$\text{Monto IVA} = \text{base\_taxable} \times \left(\frac{\text{iva\_percentage}}{100}\right)$$ (por defecto 16%)
  $$\text{Total Factura (USD)} = \text{Subtotal} + \text{Monto IVA}$$

### RN-05: Sincronización Diaria de Cuentas por Pagar
- En el Dashboard principal se deben agrupar las facturas en estado `pending` que vencen el **día de hoy** o que están programadas para pagarse mañana, destacando el monto total en moneda local (Bs.) al tipo de cambio actual.

---

## 3. Contratos de Datos (TypeScript)

A continuación se presentan las interfaces y tipos de TypeScript compartidos que guiarán el desarrollo del frontend y la base de datos:

```typescript
export interface Company {
  id: string; // UUID
  name: string;
  rif: string; // Registro de Información Fiscal (ej. J-31234567-0)
  serial_code: string; // Código serial único para vinculación de usuarios
  created_at: string; // ISO Timestamp
}

export interface User {
  id: string; // UUID, enlazado a Supabase Auth
  company_id: string; // FK
  full_name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface Provider {
  id: string; // UUID
  company_id: string; // FK
  name: string;
  rif: string; // ej. J-00033800-0
  created_at: string;
}

export interface ExchangeRate {
  id: string; // UUID
  company_id: string; // FK
  rate_value: number; // Tipo de cambio decimal (ej: 42.50)
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Invoice {
  id: string; // UUID
  company_id: string; // FK
  provider_id: string; // FK
  provider_name?: string; // Virtual, para vistas y reportes
  invoice_number: string; // Número de factura físico
  control_number: string; // Número de control fiscal
  invoice_date: string; // YYYY-MM-DD
  credit_days: number; // Días de crédito concedidos
  due_date: string; // YYYY-MM-DD (Autocalculado)
  base_taxable: number; // Base Imponible
  base_exempt: number; // Base Exenta
  sub_total: number; // base_taxable + base_exempt
  iva_percentage: number; // Porcentaje IVA (por defecto 16)
  iva_amount: number; // IVA calculado
  total_invoice: number; // sub_total + iva_amount
  exchange_rate_at_invoice: number; // Tasa de cambio registrada con la factura
  status: 'pending' | 'paid';
  created_at: string;
}
```

---

## 4. Endpoints y Consultas de Supabase

El sistema utilizará consultas de Supabase Client integradas directamente en el frontend. Las operaciones CRUD esenciales y filtros requeridos son:

### 4.1 Autenticación y Flujo Multi-Empresa Customizado
- **Registro de Empresa:** `INSERT INTO companies (name, rif, serial_code)`
- **Validación de Código Serial de Empresa:**
  ```javascript
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('serial_code', serialCode)
    .single();
  ```
- **Registro de Usuario Custom:** `INSERT INTO users (id, company_id, full_name, email, role, is_active)`
- **Obtención del Perfil de Usuario con su Empresa:**
  ```javascript
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', authUserId)
    .single();
  ```

### 4.2 Tasa del Día
- **Obtener la Tasa Más Reciente:**
  ```javascript
  const { data: rate, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false })
    .limit(1);
  ```
- **Insertar Nueva Tasa Cambiaria:**
  `INSERT INTO exchange_rates (company_id, rate_value, date)`

### 4.3 Gestión de Proveedores
- **Listar Proveedores:**
  `SELECT * FROM providers WHERE company_id = :companyId ORDER BY name ASC`
- **Crear Proveedor:**
  `INSERT INTO providers (company_id, name, rif)`

### 4.4 Gestión de Facturas
- **Listar Facturas con Información del Proveedor (Join):**
  ```javascript
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, providers(name)')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });
  ```
- **Insertar Nueva Factura:**
  `INSERT INTO invoices (company_id, provider_id, invoice_number, control_number, invoice_date, credit_days, due_date, base_taxable, base_exempt, sub_total, iva_percentage, iva_amount, total_invoice, exchange_rate_at_invoice, status)`

### 4.5 Funciones RPC Optimizadas (Remote Procedure Calls)
Para reducir la latencia y consolidar transacciones complejas, se especifican las siguientes funciones en PostgreSQL accesibles vía el cliente Supabase:

1. **`get_company_dashboard_stats(p_company_id: uuid, p_current_rate: numeric)`**
   - **Propósito:** Retorna en una sola consulta agrupada todas las métricas clave financieras del Dashboard para evitar múltiples llamadas HTTP.
   - **Campos retornados:**
     - `total_pending_usd` (numeric): Monto total pendiente en dólares.
     - `total_pending_ves_at_invoice` (numeric): Monto total pendiente en bolívares calculados con la tasa grabada en cada factura.
     - `total_pending_ves_at_current` (numeric): Monto total pendiente en bolívares recalculados dinámicamente usando la tasa actual proporcionada.
     - `total_expired_usd` (numeric): Monto vencido en dólares.
     - `total_expired_ves_at_current` (numeric): Monto vencido en bolívares recalculados con la tasa actual.
     - `total_paid_usd` (numeric): Monto total pagado en dólares.
     - `count_pending` (bigint): Cantidad de facturas pendientes.
     - `count_expired` (bigint): Cantidad de facturas vencidas pendientes.
     - `count_paid` (bigint): Cantidad de facturas pagadas.

2. **`pay_invoices_batch(p_invoice_ids: uuid[])`**
   - **Propósito:** Cambia el estado a `'paid'` para un lote de facturas de forma atómica en una sola transacción SQL.
   - **Seguridad:** Restringido a las facturas que pertenezcan a la empresa del usuario autenticado.

3. **`get_due_invoices_alert(p_company_id: uuid)`**
   - **Propósito:** Retorna facturas pendientes que expiran hoy o mañana, uniendo la información del proveedor para mostrarlas en la sección de alertas del Dashboard.

---

## 5. Componentes Frontend y Estado (Zustand)

La aplicación implementará una arquitectura reactiva moderna con los siguientes componentes y stores:

### 5.1 Stores de Zustand
1. **`useAuthStore`**: Almacena los datos del usuario logueado (`User`), la empresa asociada (`Company`), el estado de carga (`loading`), y la sesión.
2. **`useExchangeStore`**: Almacena el valor de la **Tasa del Día** para la sesión actual y coordina su actualización en Supabase.
3. **`useInvoiceStore`**: Almacena filtros activos (proveedor, estados de vencimiento, etc.) para las vistas y reportes.

### 5.2 Estructura de Vistas e Interfaz (Dashboard)
- **`Layout`**: Contenedor principal con barra lateral responsiva, barra superior elegante que incluye el selector/visor de la **Tasa del Día** y el perfil del usuario.
- **`Login / Register`**: Flujo visualmente atractivo para iniciar sesión, registrar una empresa y registrar un usuario vinculándolo mediante el código serial.
- **`Dashboard`**: Tarjetas de métricas (Total Cuentas por Pagar en USD y Bs, Total Vencido, Facturas del Día).
- **`FacturasForm`**: Formulario interactivo con campos calculados en tiempo real (Base, Exento, IVA, Vencimiento, Monto Bs).
- **`Reportes`**: Pantalla de consulta basada en TanStack Table con filtros avanzados y menú de exportación (Excel, Impresión/PDF).

---

## 6. Flujo de Usuario (UX)

### Registro de Nueva Empresa y Usuario
1. El propietario o administrador ingresa a `/register`.
2. Selecciona **"Registrar Nueva Empresa"**, introduce RIF, Razón Social y el sistema genera automáticamente un **Código Serial único** (ej. `COMP-938210`).
3. Posteriormente, el usuario (u otros empleados) se registra en la misma pantalla seleccionando **"Vincularse a Empresa"**, introduce su Nombre, Correo, Contraseña y el **Código Serial de la Empresa**.
4. El sistema busca la empresa, vincula al usuario a su ID y crea su perfil en `users`.

### Registro de Factura de Compra
1. El usuario navega a la sección de **Facturas** y presiona **"Registrar Factura"**.
2. Selecciona un proveedor del menú desplegable.
3. Introduce el número de factura, número de control y la fecha de emisión.
4. Digita los días de crédito (ej. 15 días). La **Fecha de Vencimiento se actualiza instantáneamente** en pantalla.
5. Digita la **Base Imponible** (ej: 100.00 USD) y **Base Exenta** (ej: 20.00 USD).
6. El sistema **calcula automáticamente** en tiempo real:
   - Subtotal: 120.00 USD
   - IVA (16% sobre base imponible): 16.00 USD
   - Total Factura: 136.00 USD
   - **Monto a Pagar en Moneda Local:** (Si la tasa es 45.00 Bs/$) 136.00 * 45.00 = 6,120.00 Bs.
7. Al hacer clic en Guardar, se almacena el registro y se actualiza el Dashboard.

---

## 7. Criterios de Aceptación (CA)

- [ ] **CA-01:** Las facturas registradas en una empresa **no** deben ser visibles bajo ninguna circunstancia para usuarios de otra empresa.
- [ ] **CA-02:** Al cambiar la Tasa del Día en el Panel Superior, las proyecciones en moneda local (Bs.) deben actualizarse inmediatamente en toda la interfaz (Dashboard y listados).
- [ ] **CA-03:** El formulario de facturas debe calcular automáticamente la fecha de vencimiento sumando los días de crédito a la fecha de factura.
- [ ] **CA-04:** La vista de reportes debe soportar filtrado por proveedor, fechas de vencimiento y estado de pago.
- [ ] **CA-05:** La función de exportación a PDF/Impresión debe generar un documento limpio ocultando la navegación, controles y barras de herramientas.

---

## 8. Notas y Dependencias
- **Dependencias core:** `@supabase/supabase-js`, `zustand`, `@tanstack/react-query`, `@tanstack/react-table`, `lucide-react`.
- **Exportación:** `xlsx` para exportar reportes a hojas de cálculo de Excel.
- **Diseño visual:** Tipografía **Outfit / Inter** desde Google Fonts. Fondos oscuros elegantes con estilo glassmorphism (`backdrop-blur`) y bordes suaves de color para indicadores financieros.
