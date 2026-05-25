# Especificación Técnica de Refactorización (SDD)
## Refactorización de Stores (Zustand) y Abstracción de Capa de Servicios (Supabase)

**Autor:** @Analista_Specs (bajo la coordinación del Orquestador SDD)  
**Fecha:** 25 de Mayo, 2026  
**Estado:** Pendiente de Aprobación  

---

### 1. Objetivos del Cambio
1. **Renombrar Stores**: Todos los stores de Zustand deben usar el prefijo `use` en sus nombres de archivo y firmas de exportación para seguir las convenciones de hooks de React (ej. `authStore.ts` -> `useAuthStore.ts`).
2. **Abstracción de Supabase**: Mudar todas las consultas, mutaciones y llamadas directas de Supabase (`supabase.from(...)`, `supabase.auth`, `supabase.rpc(...)`) de los archivos del store Zustand a una capa de servicios desacoplada (`src/services/`).
3. **Persistencia y Reactividad**: El store de Zustand seguirá siendo la única fuente de la verdad para el estado de la UI (manejo de `loading`, `error`, `set`, `get`), consumiendo las operaciones asíncronas de los servicios y mapeando las respuestas tipadas.

---

### 2. Estructura de Archivos Planificada

```bash
src/
├── services/
│   ├── cashService.ts (Existente)
│   ├── authService.ts [NEW]
│   ├── companyPaymentMethodService.ts [NEW]
│   ├── exchangeService.ts [NEW]
│   ├── expenseService.ts [NEW]
│   ├── invoiceService.ts [NEW]
│   ├── paymentService.ts [NEW]
│   ├── providerBankAccountService.ts [NEW]
│   ├── retentionService.ts [NEW]
│   └── shiftService.ts [NEW]
├── store/
│   ├── useAuthStore.ts [NEW] (reemplaza a authStore.ts [DELETE])
│   ├── useCompanyPaymentMethodStore.ts [NEW] (reemplaza a companyPaymentMethodStore.ts [DELETE])
│   ├── useExchangeStore.ts [NEW] (reemplaza a exchangeStore.ts [DELETE])
│   ├── useExpenseStore.ts [NEW] (reemplaza a expenseStore.ts [DELETE])
│   ├── useInvoiceStore.ts [NEW] (reemplaza a invoiceStore.ts [DELETE])
│   ├── usePaymentStore.ts [NEW] (reemplaza a paymentStore.ts [DELETE])
│   ├── useProviderBankAccountStore.ts [NEW] (reemplaza a providerBankAccountStore.ts [DELETE])
│   ├── useRetentionStore.ts [NEW] (reemplaza a retentionStore.ts [DELETE])
│   ├── useShiftStore.ts [NEW] (reemplaza a shiftStore.ts [DELETE])
│   ├── useCajaStore.ts (Existente)
│   ├── useCashRegisterStore.ts (Existente)
│   └── usePOSTerminalStore.ts (Existente)
```

---

### 3. Contratos de TypeScript y Firmas de los Nuevos Servicios

A continuación, se detallan las interfaces de servicio que contendrán toda la lógica directa con el cliente de Supabase.

#### A. `authService.ts`
```typescript
import { Company, User } from '../types';

export const authService = {
  loadSessionProfile: (): Promise<{ session: any; user: User; company: Company } | null> => {},
  login: (email: string, password: string): Promise<any> => {},
  logout: (): Promise<void> => {},
  createCompanyOnly: (companyName: string, companyRif: string): Promise<Company> => {},
  registerUserWithSerial: (
    fullName: string,
    email: string,
    password: string,
    serialCode: string,
    role?: 'admin' | 'operator'
  ): Promise<{ user: any; session: any; needsConfirmation: boolean }> => {}
};
```

#### B. `companyPaymentMethodService.ts`
```typescript
import { CompanyPaymentMethod } from '../types';

export const companyPaymentMethodService = {
  fetchMethods: (companyId: string): Promise<CompanyPaymentMethod[]> => {},
  addMethod: (methodData: Omit<CompanyPaymentMethod, 'id' | 'created_at'>): Promise<CompanyPaymentMethod> => {},
  deleteMethod: (methodId: string): Promise<void> => {}
};
```

#### C. `exchangeService.ts`
```typescript
import { ExchangeRate } from '../types';

export const exchangeService = {
  fetchCurrentRate: (companyId: string): Promise<ExchangeRate | null> => {},
  fetchHistory: (companyId: string): Promise<ExchangeRate[]> => {},
  updateCurrentRate: (companyId: string, rateValue: number): Promise<ExchangeRate> => {},
  updateInvoicesRate: (companyId: string, rateValue: number): Promise<void> => {}
};
```

#### D. `expenseService.ts`
```typescript
import { Expense, CreateExpenseInput } from '../types';

export const expenseService = {
  fetchExpenses: (companyId: string): Promise<Expense[]> => {},
  addExpense: (companyId: string, input: CreateExpenseInput): Promise<Expense> => {},
  deleteExpense: (id: string): Promise<void> => {}
};
```

#### E. `invoiceService.ts`
```typescript
import { Invoice, Provider } from '../types';

export const invoiceService = {
  fetchProviders: (companyId: string): Promise<Provider[]> => {},
  createProvider: (companyId: string, name: string, rif: string, isTaxpayer: boolean, ivaRetentionPercentage?: number): Promise<Provider> => {},
  updateProvider: (providerId: string, name: string, rif: string, isTaxpayer: boolean, ivaRetentionPercentage?: number): Promise<Provider> => {},
  deleteProvider: (providerId: string): Promise<void> => {},
  
  fetchInvoices: (companyId: string): Promise<Invoice[]> => {},
  createInvoice: (payload: any): Promise<Invoice> => {},
  updateInvoice: (invoiceId: string, payload: any): Promise<Invoice> => {},
  updateInvoiceStatus: (invoiceId: string, status: 'pending' | 'paid'): Promise<void> => {},
  payInvoicesBatch: (invoiceIds: string[]): Promise<void> => {},
  deleteInvoice: (invoiceId: string): Promise<void> => {}
};
```

#### F. `paymentService.ts`
```typescript
import { PaymentTransaction } from '../types';

export const paymentService = {
  fetchAllPayments: (companyId: string): Promise<PaymentTransaction[]> => {},
  fetchPaymentsByProvider: (companyId: string, providerId: string): Promise<PaymentTransaction[]> => {},
  registerPayment: (paymentData: Omit<PaymentTransaction, 'id' | 'created_at'>): Promise<PaymentTransaction> => {},
  updateInvoiceStatusToPaid: (invoiceId: string): Promise<void> => {}
};
```

#### G. `providerBankAccountService.ts`
```typescript
import { ProviderBankAccount } from '../types';

export const providerBankAccountService = {
  fetchAccounts: (providerId: string): Promise<ProviderBankAccount[]> => {},
  updateAccounts: (providerId: string, accounts: ProviderBankAccount[]): Promise<void> => {}
};
```

#### H. `retentionService.ts`
```typescript
import { InvoiceRetention } from '../types';

export const retentionService = {
  fetchRetentionsByInvoice: (invoiceId: string): Promise<InvoiceRetention[]> => {},
  fetchAllRetentions: (companyId: string): Promise<InvoiceRetention[]> => {},
  generateRetentionCorrelative: (companyId: string): Promise<string> => {},
  addRetention: (payload: any): Promise<InvoiceRetention> => {}
};
```

#### I. `shiftService.ts`
```typescript
import { StaffShift } from '../types';

export const shiftService = {
  fetchShiftsForDateRange: (companyId: string, startDate: string, endDate: string): Promise<StaffShift[]> => {},
  addShift: (companyId: string, shiftData: any): Promise<StaffShift> => {},
  deleteShift: (id: string): Promise<void> => {}
};
```

---

### 4. Flujo de Trabajo para Componentes Frontend

- **Antes:**
```typescript
import { useAuthStore } from '../store/authStore';
```
- **Después:**
```typescript
import { useAuthStore } from '../store/useAuthStore';
```

Todas las llamadas en la UI permanecen idénticas ya que la firma pública del hook (ej: `const { user, loading, login } = useAuthStore()`) se conservará exactamente igual.

---

### 5. Plan de Verificación

1. **Compilación Estricta**: Ejecutar `npm run build` para asegurar que ningún archivo frontend importe la ruta legada sin el prefijo `use`.
2. **Pruebas de Flujo**:
   - Inicio de sesión y carga del perfil (Auth).
   - Conversión de tasas cambiarias (Exchange).
   - CRUD de facturas y proveedores (Invoice).
   - Registro de transacciones de pago (Payment).
   - Reconciliación bancaria.
