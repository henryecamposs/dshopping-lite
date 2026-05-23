# Especificación Técnica (SDD): Habladores Premium y Calendario de Turnos Persistente

Este documento define las especificaciones para actualizar y perfeccionar el **Generador de Habladores (Precios)** y el **Módulo de Turnos y Guardias** con persistencia en Supabase, maquetación de impresión y el diseño estético de alta gama de la plataforma.

---

## 1. Módulo de Habladores de Precios (PriceTagGenerator)

### Reglas de Negocio e Impresión
1. **Datos de Etiquetas**: Cada etiqueta contiene el nombre del producto, SKU, y precio en USD.
2. **Cálculo en Caliente**: Convierte dinámicamente a Bolívares usando la tasa cambiaria del día en tiempo real (`useExchangeStore`).
3. **Estilo Visual**: 
   - **UI en Pantalla**: Tarjetas glassmorphism semitransparentes, inputs flotantes premium, botón de agregar y cola interactiva con eliminación directa.
   - **Formato de Impresión**: 
     - Grid de 2 columnas de ancho (`grid-cols-2`).
     - Borde doble negro y tipografía condensada de alta visibilidad para que luzca limpio, ejecutivo y profesional.
     - Indicador del nombre de la empresa en la esquina inferior izquierda.
     - Ocultación total de botones de edición y barras laterales (`print:hidden`).
     - Alerta de confirmación antes de la impresión con recomendaciones sobre cómo ajustar las opciones del navegador (orientación horizontal, sin márgenes, fondos activos).

---

## 2. Calendario de Turnos y Planificación de Guardias (ShiftCalendar)

### Reglas de Negocio y Base de Datos
1. **Persistencia Real**: Conectado a la tabla de Supabase `public.staff_shifts` que cuenta con aislamiento RLS multi-empresa.
2. **Gestión de Turnos (CRUD)**:
   - Registro de turnos mediante modal premium integrado en la vista (empleado, tipo de turno, fecha y notas).
   - Tipos de turno soportados: `Mañana`, `Tarde`, `Integral`, `Libre`, `Guardia Nocturna`.
   - Opción para eliminar turnos directamente con confirmación Swal.
3. **Navegación Semanal**: Permite avanzar o retroceder semanas, calculando los días de Lunes a Domingo de manera dinámica.
4. **Diseño de Impresión (Hoja de Guardias)**:
   - Botón dedicado de **"Imprimir Semana de Guardias"**.
   - Al imprimir, oculta toda la navegación lateral y barras superiores de la app.
   - Presenta un membrete elegante con el nombre de la empresa y RIF, indicando de forma explícita el periodo de la semana en formato: `"Semana de Guardias del DD/MM/YYYY al DD/MM/YYYY"`.
   - Distribuye las celdas de los días en un formato horizontal optimizado para papel A4 con rejilla limpia y celdas legibles.

---

## 3. Contratos de Datos (TypeScript)

### `src/types/index.ts` (Existente)
```typescript
export interface StaffShift {
  id: string;
  company_id: string;
  employee_name: string;
  date: string;
  shift_type: 'Mañana' | 'Tarde' | 'Integral' | 'Libre' | 'Guardia Nocturna';
  notes?: string;
  created_at: string;
}
```

---

## 4. Componentes y Capa de Estado (Zustand)

### 1. Store Zustand para Turnos (`src/store/shiftStore.ts`)
- **Estado**:
  - `shifts: StaffShift[]`
  - `loading: boolean`
  - `error: string | null`
- **Acciones**:
  - `fetchShiftsForDateRange(companyId: string, startDate: string, endDate: string): Promise<void>`
  - `addShift(companyId: string, input: Omit<StaffShift, 'id' | 'company_id' | 'created_at'>): Promise<boolean>`
  - `deleteShift(id: string): Promise<boolean>`

### 2. Vista de Guardias (`src/views/Utilities/Shifts/ShiftCalendar.tsx`)
- UI refinada con glassmorphism.
- Vista semanal con días en grid de 7 columnas responsivas.
- Cada día lista los empleados y sus tipos de guardias coloreados con badges HSL de la paleta del tema de la aplicación.
- Modal premium de asignación de turno con validación de campos.
- Botón de impresión ejecutiva de guardias.

---

## 5. Preguntas Aclaratorias para el Usuario
Para perfeccionar la entrega, solicitamos validar los siguientes puntos:
1. **Persistencia de Turnos**: ¿Deseas que implementemos la conexión completa con Supabase utilizando el store Zustand real (`shiftStore.ts`), permitiendo que las guardias de tus trabajadores queden guardadas en la base de datos de manera definitiva por empresa? *(Altamente Recomendado)*
2. **Formato Visual del Hablador**: ¿Deseas que la etiqueta impresa incluya el logo del sistema y el nombre de tu empresa, o prefieres una etiqueta minimalista tradicional de supermercado (solo Nombre, SKU, Precio Bs y Ref. USD)?
3. **Tipos de Turnos**: ¿Los tipos actuales (`Mañana`, `Tarde`, `Integral`, `Libre`, `Guardia Nocturna`) cubren la operatividad de tu negocio o necesitas agregar algún otro?
