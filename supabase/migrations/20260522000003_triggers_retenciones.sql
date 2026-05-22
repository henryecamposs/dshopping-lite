-- Migración: Trigger para auto-calcular el campo net_payable de las facturas
-- Desarrollado por @Dev_Node bajo la metodología SDD

-- 1. Función para actualizar net_payable tras operaciones en invoice_retentions
CREATE OR REPLACE FUNCTION public.fn_update_invoice_net_payable()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_retentions NUMERIC(15, 2);
    v_total_invoice NUMERIC(15, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Calcular suma de todas las retenciones asociadas a la factura
    SELECT COALESCE(SUM(retention_amount), 0.00)
    INTO v_total_retentions
    FROM public.invoice_retentions
    WHERE invoice_id = v_invoice_id;

    -- Obtener el total original de la factura
    SELECT total_invoice
    INTO v_total_invoice
    FROM public.invoices
    WHERE id = v_invoice_id;

    -- Actualizar net_payable restando las retenciones
    UPDATE public.invoices
    SET net_payable = COALESCE(v_total_invoice, 0.00) - v_total_retentions
    WHERE id = v_invoice_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger sobre public.invoice_retentions
DROP TRIGGER IF EXISTS trg_update_invoice_net_payable ON public.invoice_retentions;
CREATE TRIGGER trg_update_invoice_net_payable
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_retentions
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_invoice_net_payable();

-- 3. Modificar la función fn_calculate_invoice_financials de invoices para inicializar net_payable
CREATE OR REPLACE FUNCTION public.fn_calculate_invoice_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_total_retentions NUMERIC(15, 2);
BEGIN
    -- 1. Auto-cálculo de la Fecha de Vencimiento sumando los Días de Crédito a la Fecha de Factura
    NEW.due_date := NEW.invoice_date + NEW.credit_days;

    -- 2. Auto-cálculo del Subtotal (Base Imponible + Base Exenta)
    NEW.sub_total := NEW.base_taxable + NEW.base_exempt;

    -- 3. Auto-cálculo del monto de IVA en base a la tasa
    NEW.iva_amount := ROUND((NEW.base_taxable * (NEW.iva_percentage / 100.00)), 2);

    -- 4. Auto-cálculo del Total de la factura (Subtotal + IVA)
    NEW.total_invoice := NEW.sub_total + NEW.iva_amount;

    -- 5. Auto-cálculo del net_payable inicial o recalculado
    IF NEW.id IS NOT NULL THEN
        SELECT COALESCE(SUM(retention_amount), 0.00)
        INTO v_total_retentions
        FROM public.invoice_retentions
        WHERE invoice_id = NEW.id;
        
        NEW.net_payable := NEW.total_invoice - v_total_retentions;
    ELSE
        NEW.net_payable := NEW.total_invoice;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
