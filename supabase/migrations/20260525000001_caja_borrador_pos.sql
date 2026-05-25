-- Migración: Soporte para Borrador de Arqueo y Vinculación de POS en Apertura
-- Desarrollado por @Dev_Node bajo la metodología SDD
-- Fecha: 2026-05-25

-- =========================================================================
-- 1. ALTERACIONES EN LA TABLA public.cash_closures
-- =========================================================================

-- Añadir pos_terminal_id para asociar el turno a un POS físico
ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS pos_terminal_id UUID REFERENCES public.pos_terminals(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cash_closures.pos_terminal_id IS 'ID del terminal POS físico asociado a este turno de caja en la apertura';

-- Modificar closing_date para permitir valores nulos (cajas abiertas/borradores)
ALTER TABLE public.cash_closures 
ALTER COLUMN closing_date DROP NOT NULL;

ALTER TABLE public.cash_closures 
ALTER COLUMN closing_date DROP DEFAULT;

-- Añadir columna para registrar las ventas en borrador
ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS sales_system_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (sales_system_usd >= 0);

COMMENT ON COLUMN public.cash_closures.sales_system_usd IS 'Monto de ventas del sistema Z registrado para la conciliación de este turno';

-- Añadir columnas JSONB para persistir denominaciones físicas y billeteras en borrador
ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS cash_count_details JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS digital_wallets_details JSONB DEFAULT '{}'::jsonb NOT NULL;

COMMENT ON COLUMN public.cash_closures.cash_count_details IS 'Arreglos con la persistencia del borrador del conteo físico de billetes en USD y Bs.';
COMMENT ON COLUMN public.cash_closures.digital_wallets_details IS 'Arreglo JSON con el borrador del desglose individual por billetera digital';

-- =========================================================================
-- 2. ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_cash_closures_pos_terminal ON public.cash_closures(pos_terminal_id);
