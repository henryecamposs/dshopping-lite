-- Migración Fase 4: Módulo de Gastos Operativos (Expenses) con RLS
-- Desarrollado por @Dev_Node bajo la metodología SDD

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Servicios Públicos, Alquileres, Nómina/Sueldos, Mantenimiento, Impuestos, Suministros, Otros
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL CHECK (currency IN ('USD', 'VES')),
    exchange_rate_id UUID NOT NULL REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
    payment_method_id UUID REFERENCES public.company_payment_methods(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento multi-empresa
DROP POLICY IF EXISTS "Aislamiento de gastos por empresa" ON public.expenses;
CREATE POLICY "Aislamiento de gastos por empresa"
    ON public.expenses FOR ALL
    USING (company_id = public.get_user_company_id(auth.uid()))
    WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Índices para optimizar las consultas y reportes por rango de fecha, categoría y empresa
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
