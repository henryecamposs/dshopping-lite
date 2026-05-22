// dShopping Lite - Formulario de Registro de Facturas
// Implementación con auto-cálculos financieros y cambiarios en tiempo real

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { Save, Plus, AlertCircle, Calendar } from 'lucide-react';
import { Invoice } from '../types';
import Swal from 'sweetalert2';

interface InvoiceFormProps {
  invoiceToEdit?: Invoice | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoiceToEdit, onSuccess, onCancel }) => {
  const { company } = useAuthStore();
  const { currentRate, convertToLocalCurrency, formatCurrencyLocal, formatCurrencyUSD } = useExchangeStore();
  const { providers, createProvider, createInvoice, updateInvoice } = useInvoiceStore();

  // Estados del Formulario
  const [providerId, setProviderId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [controlNumber, setControlNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [creditDays, setCreditDays] = useState<number>(0);
  const [baseTaxable, setBaseTaxable] = useState<string>('0.00');
  const [baseExempt, setBaseExempt] = useState<string>('0.00');
  const [ivaPercentage, setIvaPercentage] = useState<number>(16);
  
  // Estados para cálculos derivados en pantalla (tiempo real)
  const [calculatedDueDate, setCalculatedDueDate] = useState<string>('');
  const [subTotal, setSubTotal] = useState<number>(0);
  const [ivaAmount, setIvaAmount] = useState<number>(0);
  const [totalUSD, setTotalUSD] = useState<number>(0);
  const [totalLocalBs, setTotalLocalBs] = useState<number>(0);

  // Estado para creación de proveedor en línea
  const [showAddProvider, setShowAddProvider] = useState<boolean>(false);
  const [newProviderName, setNewProviderName] = useState<string>('');
  const [newProviderRif, setNewProviderRif] = useState<string>('');
  const [providerError, setProviderError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Efecto para pre-rellenar datos si estamos en modo Edición
  useEffect(() => {
    if (invoiceToEdit) {
      setProviderId(invoiceToEdit.provider_id);
      setInvoiceNumber(invoiceToEdit.invoice_number);
      setControlNumber(invoiceToEdit.control_number);
      setInvoiceDate(invoiceToEdit.invoice_date);
      setCreditDays(invoiceToEdit.credit_days);
      setBaseTaxable(invoiceToEdit.base_taxable.toFixed(2));
      setBaseExempt(invoiceToEdit.base_exempt.toFixed(2));
      setIvaPercentage(invoiceToEdit.iva_percentage);
    } else {
      setProviderId('');
      setInvoiceNumber('');
      setControlNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setCreditDays(0);
      setBaseTaxable('0.00');
      setBaseExempt('0.00');
      setIvaPercentage(16);
    }
  }, [invoiceToEdit]);

  // =========================================================================
  // LÓGICA DE AUTO-CÁLCULO EN TIEMPO REAL (Requisitos de Negocio Core)
  // =========================================================================
  useEffect(() => {
    /* 
      1. CÁLCULO AUTOMÁTICO DE FECHA DE VENCIMIENTO:
      due_date = invoice_date + credit_days
    */
    if (invoiceDate) {
      const date = new Date(invoiceDate + 'T12:00:00'); // Evitar problemas de desfase horario local/UTC
      date.setDate(date.getDate() + Number(creditDays));
      setCalculatedDueDate(date.toISOString().split('T')[0]);
    }
  }, [invoiceDate, creditDays]);

  useEffect(() => {
    /*
      2. CÁLCULOS FINANCIEROS AUTOMÁTICOS:
      - Subtotal = Base Imponible + Base Exenta
      - Monto IVA = Base Imponible * (Tasa IVA / 100)
      - Total Factura (USD) = Subtotal + Monto IVA
      - Monto a Pagar (Bs.) = Total Factura (USD) * Tasa Cambiaria del Día (Bs/$)
    */
    const taxableVal = parseFloat(baseTaxable) || 0;
    const exemptVal = parseFloat(baseExempt) || 0;
    
    // Subtotal: Suma de la base gravable y la exenta
    const calculatedSub = taxableVal + exemptVal;
    setSubTotal(calculatedSub);

    // Monto IVA: Se calcula únicamente sobre la Base Gravable/Imponible
    const calculatedIva = Number((taxableVal * (ivaPercentage / 100)).toFixed(2));
    setIvaAmount(calculatedIva);

    // Total de Factura en Divisas
    const calculatedTotalUSD = Number((calculatedSub + calculatedIva).toFixed(2));
    setTotalUSD(calculatedTotalUSD);

    // Monto a pagar proyectado en Moneda Local
    // Multiplica el total en USD por la tasa cambiaria del día configurada
    const convertedLocal = convertToLocalCurrency(calculatedTotalUSD);
    setTotalLocalBs(convertedLocal);

  }, [baseTaxable, baseExempt, ivaPercentage, convertToLocalCurrency]);

  // Manejar creación rápida de Proveedor
  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderError(null);

    if (!company?.id) return;
    if (!newProviderName.trim() || !newProviderRif.trim()) {
      setProviderError('Nombre y RIF son campos requeridos.');
      return;
    }

    const res = await createProvider(company.id, newProviderName, newProviderRif);
    if (res.success && res.data) {
      setProviderId(res.data.id);
      setShowAddProvider(false);
      setNewProviderName('');
      setNewProviderRif('');
    } else {
      setProviderError(res.error || 'Error al guardar el proveedor.');
    }
  };

  // Manejar el envío de la factura a Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!company?.id) return;
    if (!providerId) {
      setFormError('Debe seleccionar un proveedor.');
      return;
    }
    if (!invoiceNumber.trim() || !controlNumber.trim()) {
      setFormError('Los números de factura y de control son obligatorios.');
      return;
    }

    setIsSubmitting(true);

    let res;
    if (invoiceToEdit) {
      res = await updateInvoice(invoiceToEdit.id, {
        provider_id: providerId,
        invoice_number: invoiceNumber,
        control_number: controlNumber,
        invoice_date: invoiceDate,
        credit_days: Number(creditDays),
        base_taxable: parseFloat(baseTaxable) || 0,
        base_exempt: parseFloat(baseExempt) || 0,
        iva_percentage: ivaPercentage,
      });
    } else {
      res = await createInvoice({
        company_id: company.id,
        provider_id: providerId,
        invoice_number: invoiceNumber,
        control_number: controlNumber,
        invoice_date: invoiceDate,
        credit_days: Number(creditDays),
        base_taxable: parseFloat(baseTaxable) || 0,
        base_exempt: parseFloat(baseExempt) || 0,
        iva_percentage: ivaPercentage,
        exchange_rate_at_invoice: currentRate?.rate_value || 45.00,
        status: 'pending' // Estado inicial por defecto de cuenta por pagar
      });
    }

    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        title: invoiceToEdit ? '¡Factura Actualizada!' : '¡Factura Registrada!',
        text: invoiceToEdit 
          ? 'Los cambios se han guardado exitosamente.' 
          : 'La factura ha sido registrada exitosamente en el sistema.',
        icon: 'success',
        confirmButtonColor: '#8b5cf6', // Color primario violeta
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937',
      });
      onSuccess();
    } else {
      setFormError(res.error || 'Ocurrió un error al guardar la factura.');
      Swal.fire({
        title: 'Error',
        text: res.error || 'Ocurrió un error al guardar la factura.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* FORMULARIO */}
      <div className="lg:col-span-2 glass-card rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
          <span>{invoiceToEdit ? 'Editar Factura' : 'Registrar Nueva Factura'}</span>
        </h3>

        {formError && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN PROVEEDOR */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-muted-foreground">Proveedor</label>
              <button
                type="button"
                onClick={() => setShowAddProvider(!showAddProvider)}
                className="text-xs text-primary hover:text-accent font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                Nuevo Proveedor
              </button>
            </div>

            {showAddProvider ? (
              <div className="p-4 bg-muted/20 border border-border-main rounded-2xl space-y-4">
                <p className="text-xs font-semibold text-primary">Crear Proveedor Rápido</p>
                {providerError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{providerError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre del Proveedor"
                    value={newProviderName}
                    onChange={(e) => setNewProviderName(e.target.value)}
                    className="input-premium py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="RIF (ej. J-00033800-0)"
                    value={newProviderRif}
                    onChange={(e) => setNewProviderRif(e.target.value)}
                    className="input-premium py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProvider(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-text-main"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddProvider}
                    className="bg-primary hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="input-premium w-full"
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.rif})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* DATOS DE CONTROL Y FECHAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Número de Factura</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="input-premium w-full font-mono"
                placeholder="F-001928"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Número de Control</label>
              <input
                type="text"
                value={controlNumber}
                onChange={(e) => setControlNumber(e.target.value)}
                className="input-premium w-full font-mono"
                placeholder="00-983827"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Fecha de Factura</label>
              <div className="relative">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="input-premium w-full font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Días de Crédito</label>
              <input
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-premium w-full font-mono"
                placeholder="0"
              />
            </div>
          </div>

          {/* IMPORTES FINANCIEROS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border-main">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Base Imponible ($)</label>
              <input
                type="text"
                value={baseTaxable}
                onChange={(e) => setBaseTaxable(e.target.value)}
                className="input-premium w-full font-mono text-right"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Base Exenta ($)</label>
              <input
                type="text"
                value={baseExempt}
                onChange={(e) => setBaseExempt(e.target.value)}
                className="input-premium w-full font-mono text-right"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">IVA (%)</label>
              <select
                value={ivaPercentage}
                onChange={(e) => setIvaPercentage(Number(e.target.value))}
                className="input-premium w-full font-mono text-center"
              >
                <option value="16">16% (IVA Regular)</option>
                <option value="8">8% (IVA Reducido)</option>
                <option value="0">0% (Sin IVA)</option>
              </select>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="flex justify-end gap-4 pt-6 border-t border-border-main">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              <Save size={18} />
              {isSubmitting ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>

      {/* PANEL LATERAL DE CÁLCULO Y VISTA PREVIA (AESTHETIC & INTERACTIVE) */}
      <div className="space-y-6">
        {/* CALENDARIO DE CRÉDITO */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Vencimiento Proyectado
          </h4>
          <div className="bg-muted/20 border border-border-main rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
              <p className="text-lg font-bold text-text-main font-mono">{calculatedDueDate}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl text-center">
              <p className="text-xl font-extrabold text-primary font-mono">{creditDays}</p>
              <p className="text-[10px] text-primary/80 uppercase font-bold">Días</p>
            </div>
          </div>
        </div>

        {/* FACTURA DIGITAL (RESUMEN FINANCIERO DINÁMICO) */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden glow-indigo">
          {/* Fondo decorativo */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"></div>

          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">
            Vista Previa de Cálculos
          </h4>

          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base Imponible</span>
              <span className="text-text-main font-semibold">{formatCurrencyUSD(parseFloat(baseTaxable) || 0)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Base Exenta</span>
              <span className="text-text-main font-semibold">{formatCurrencyUSD(parseFloat(baseExempt) || 0)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground border-b border-border-main pb-3">
              <span>Monto IVA ({ivaPercentage}%)</span>
              <span className="text-text-main font-semibold">{formatCurrencyUSD(ivaAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-lg font-bold pt-2 border-b border-border-main pb-4">
              <span className="text-text-main">TOTAL USD</span>
              <span className="text-primary font-extrabold">{formatCurrencyUSD(totalUSD)}</span>
            </div>

            {/* MONTO A PAGAR EN BS. (CONVERSIÓN CAMBIARIA EN TIEMPO REAL) */}
            <div className="pt-2">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-2">Monto a pagar en moneda local</p>
              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                  {formatCurrencyLocal(totalLocalBs)}
                </p>
                <div className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">
                  Tasa Aplicada: {currentRate ? currentRate.rate_value.toFixed(2) : '45.00'} Bs/$
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
