# Memoria de la Aplicación: dShopping Lite

Este documento constituye la memoria técnica, arquitectónica y operativa de **dShopping Lite** (Sistema de Gestión de Cuentas por Pagar y Control Cambiario Inteligente). Su propósito es salvaguardar el estado actual, las decisiones de diseño y las especificaciones del sistema para futuras iteraciones de desarrollo.

---

## 1. Visión General del Sistema
**dShopping Lite** es una aplicación web SPA de alto rendimiento diseñada para la administración corporativa de cuentas por pagar en entornos multi-empresa, con soporte nativo para el control cambiario dinámico Dólar / Bolívar (USD/Bs.).

### Tecnologías Core
- **Frontend**: React 19 (StrictMode) + Vite (ESM modular bundler).
- **Backend / Persistencia**: Supabase (PostgreSQL) con políticas de seguridad RLS a nivel de fila y triggers reactivos.
- **Manejo de Estado**: Zustand (Store ligero, persistente y reactivo).
- **Estilos / Temas**: CSS Vanilla con variables de diseño basadas en el estándar **OKLCH** y Tailwind CSS v4 para utilidades.
- **Librerías de Exportación**: `jsPDF` + `jspdf-autotable` para reportes/comprobantes y `xlsx` (SheetJS) para libros Excel binarios nativos.

---

## 2. Arquitectura de Base de Datos (Supabase Schema)
El motor de base de datos PostgreSQL implementado en Supabase gestiona las relaciones fiscales de forma atómica y multi-empresa aislada:

### Tablas Principales
1. **`companies`**: Entidades corporativas activas.
   * `id`: UUID (Primary Key).
   * `name`: Text (Razón social).
   * `rif`: Text (RIF único, formato J-12345678-9).
   * `serial_code`: Text (Código único autogenerado de 8 caracteres para vinculación de operadores).
2. **`users`**: Usuarios y operadores asociados.
   * `id`: UUID (Mapeado a `auth.users`).
   * `company_id`: UUID (Foreign Key a `companies`).
   * `name`: Text.
   * `email`: Text.
   * `role`: Text ('admin' | 'operator').
3. **`providers`**: Catálogo de proveedores beneficiarios por empresa.
   * `id`: UUID (Primary Key).
   * `company_id`: UUID (Foreign Key a `companies`).
   * `name`: Text.
   * `rif`: Text.
4. **`invoices`**: Registro de facturas y obligaciones de cuentas por pagar.
   * `id`: UUID (Primary Key).
   * `company_id`: UUID.
   * `provider_id`: UUID (Foreign Key a `providers`).
   * `provider_name`: Text (Copia desnormalizada para rapidez de lectura).
   * `invoice_number`: Text.
   * `control_number`: Text.
   * `invoice_date`: Date.
   * `credit_days`: Integer.
   * `due_date`: Date.
   * `base_taxable`: Numeric.
   * `base_exempt`: Numeric.
   * `iva_percentage`: Numeric.
   * `iva_amount`: Numeric.
   * `total_invoice`: Numeric.
   * `status`: Text ('pending' | 'paid').
   * `exchange_rate_at_invoice`: Numeric (Tasa cambiaria del Bolívar al momento del registro).

### Seguridad RLS (Row-Level Security)
Cada consulta de lectura, escritura o modificación valida de forma atómica el `company_id` del usuario autenticado contra el registro mediante la función optimizada:
```sql
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id uuid)
RETURNS uuid AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  RETURN (SELECT company_id FROM public.users WHERE id = p_user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 3. Estado de la Aplicación (Zustand Stores)

- **`authStore.ts`**:
  * Controla la sesión activa, empresa registrada y perfil de usuario.
  * Flujo de registro en 2 Pasos decoplado:
    * Paso 1: Creación de la empresa y entrega del Código Serial Corporativo.
    * Paso 2: Registro del usuario administrador asociado al código.
  * Traducción robusta de excepciones nativas de Supabase.
- **`exchangeStore.ts`**:
  * Centraliza el Bolívar Live Sync.
  * Permite la sincronización cambiaria reactiva del día (`currentRate`).
  * Propaga dinámicamente cualquier cambio en la tasa diaria actualizando la base de datos de facturas y re-calculando todos los montos equivalentes en caliente en la UI.
- **`invoiceStore.ts`**:
  * Administra el CRUD contable de facturas y los pagos masivos transaccionales en lote mediante RPC.

---

## 4. Estética de Diseño y Temas (OKLCH)
Toda la UI está construida bajo los principios de la guía de desarrollo visual premium, empleando tokens dinámicos en [index.css](file:///c:/Users/DELL/Documents/dPana%20Projects/dPana%20Compras/src/index.css):
- **Tema Violeta & Lavanda**: Gradientes y bordes sutiles basados en el espacio de color OKLCH para un contraste visual superior de **4.5:1** (cumpliendo WCAG AA en Modo Claro).
- **Botón Yellow-400**: El botón principal `.btn-primary` destaca en color amarillo sólido brillante (`#facc15`) y tipografía oscura (`slate-950`) para un contraste de marca premium (Purple & Gold).

---

## 5. Sistemas de Exportación e Impresión

### Vista Previa HTML (`PrintPreviewModal.tsx`)
- Emula digitalmente una hoja Carta (Letter) física, desglosando base imponible, exenta, IVA, total USD e indicador destacado de conversión a bolívares con tasa del día.
- Incorpora scroll vertical premium elástico `.custom-scrollbar` con riel violeta traslúcido para adaptarse a pantallas de baja altura.
- Posee reglas `@media print` en `index.css` que resetean flexboxes e inhabilitan visibilidad de sidebars/modales durante la impresión nativa (`window.print()`), garantizando cero clippings.

### Exportador General (`ExportModal.tsx`)
- **Excel Real**: Genera libros binarios `.xlsx` mediante la librería `xlsx` (SheetJS) con formatos numéricos idóneos y auto-ajuste de anchos de columna.
- **PDF General**: Genera reportes tabulares horizontales estructurados con cabeceras de marca y paginación.

### Exporador PDF Individual (`PrintPreviewModal.tsx`)
- Incorpora un botón **"Exportar PDF"** en la barra superior.
- Utiliza la función modular limpia `autoTable(doc, options)` de `jspdf-autotable`.
- Descarga localmente un comprobante Letter vertical con membrete violeta corporativo, datos de emisor y proveedor beneficiario, desglose de montos y conversión cambiaria destacada a bolívares de forma 100% cliente y sin peticiones extras.

---

## 6. Automatización de Despliegue (Cloudflare Pages)

- **Despliegue Local (`scripts/deploy.ps1`)**: Script interactivo de Windows PowerShell que limpia dependencias, compila de forma nativa en producción (`npm run build`) y gatilla el despliegue interactivo mediante el CLI de Wrangler (`npx wrangler pages deploy dist`) con inicio de sesión del navegador.
- **Manual de Despliegue (`DEPLOYMENT.md`)**: Registro de variables de entorno de producción (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), workflows automáticos de GitHub Actions CI/CD y guías detalladas para reversiones de emergencia instantáneas.

