import React, { useState, useEffect } from 'react';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useExchangeStore } from '../../store/useExchangeStore';
import { useProviderBankAccountStore } from '../../store/useProviderBankAccountStore';
import { useCompanyPaymentMethodStore } from '../../store/useCompanyPaymentMethodStore';
import { CreditCard, Landmark, Coins, DollarSign, Wallet, X } from 'lucide-react';
import Swal from 'sweetalert2';

interface PaymentFormProps {
  companyId: string;
  providerId: string;
  invoiceId?: string;
  amountDue: number; // Monto adeudado sugerido
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  companyId, 
  providerId, 
  invoiceId,
  amountDue,
  onSuccess,
  onCancel 
}) => {
  const { registerPayment, loading: paying } = usePaymentStore();
  const { currentRate, formatCurrencyUSD } = useExchangeStore();
  const { accounts, fetchAccounts, loading: loadingAccounts } = useProviderBankAccountStore();
  const { methods, fetchMethods } = useCompanyPaymentMethodStore();

  const [amountPaid, setAmountPaid] = useState<number>(amountDue);
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle'>('Transferencia');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [selectedCompanyMethodId, setSelectedCompanyMethodId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [originBank, setOriginBank] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    fetchAccounts(companyId, providerId);
    fetchMethods(companyId);
  }, [companyId, providerId, fetchAccounts, fetchMethods]);

  const handleCompanyMethodChange = (methodId: string) => {
    setSelectedCompanyMethodId(methodId);
    if (!methodId) {
      setOriginBank('');
      return;
    }
    const selected = methods.find(m => m.id === methodId);
    if (selected) {
      setPaymentMethod(selected.type);
      setOriginBank(selected.bank_name || selected.name);
      setObservation(`Pago vía ${selected.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRate) {
        Swal.fire('Error', 'No hay una tasa de cambio configurada para registrar el pago.', 'error');
        return;
    }

    const success = await registerPayment({
      company_id: companyId,
      provider_id: providerId,
      invoice_id: invoiceId,
      exchange_rate_id: currentRate.id, // Relación estricta al historial
      amount_paid: amountPaid,
      currency,
      payment_method: paymentMethod,
      destination_account_id: destinationAccountId || undefined,
      reference_number: referenceNumber || undefined,
      origin_bank: originBank || undefined,
      observation: observation || undefined,
      payment_date: new Date().toISOString().split('T')[0]
    });

    if (success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Pago registrado exitosamente.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      if (onSuccess) onSuccess();
    } else {
      Swal.fire('Error', 'Ocurrió un error al registrar la transacción de pago.', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-border-main dark:border-indigo-950/40 w-full max-w-lg mx-auto rounded-3xl shadow-xl flex flex-col h-[95vh] max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-250">
      
      {/* CABECERA (FIJA) */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border-main/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-text-main">Registrar Egresos</h2>
            <p className="text-[11px] text-muted-foreground font-semibold">Amortizar deuda del proveedor</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* FORMULARIO Y CUERPO SCROLLABLE */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar flex flex-col justify-between">
        
        <div className="space-y-4">
          {/* Tasa cambiaria informativa */}
          <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 dark:from-indigo-950/20 dark:to-primary/20 border border-primary/20 rounded-2xl p-4 flex justify-between items-center text-xs font-semibold">
             <span className="text-primary dark:text-indigo-400">Tasa Oficial BCV:</span>
             <span className="text-text-main font-mono text-sm font-extrabold">{currentRate?.rate_value ? `Bs. ${currentRate.rate_value.toFixed(2)}` : 'S/N'}</span>
          </div>

          {/* Importe y moneda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Monto a Abonar</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-mono text-sm font-bold">
                  {currency === 'USD' ? '$' : 'Bs.'}
                </span>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  className="input-premium w-full text-sm pl-9 font-mono font-bold"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">Sugerido: {formatCurrencyUSD(amountDue)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Moneda</label>
              <select 
                className="input-premium w-full text-sm py-2.5"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES')}
              >
                <option value="USD">USD ($)</option>
                <option value="VES">VES (Bs.)</option>
              </select>
            </div>
          </div>

          {/* Forma de Pago Origen de la Empresa (CREADOR DINÁMICO) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Forma de Pago (Nuestra Cuenta / Origen)</label>
            <select 
              className="input-premium w-full text-sm py-2.5"
              value={selectedCompanyMethodId}
              onChange={(e) => handleCompanyMethodChange(e.target.value)}
            >
              <option value="">-- Pago Manual / Sin Cuenta Pre-Registrada --</option>
              {methods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.name} ({method.type})
                </option>
              ))}
            </select>
          </div>

          {/* Método de pago general */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Método de Transferencia</label>
            <select 
              className="input-premium w-full text-sm py-2.5"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Pago Móvil">Pago Móvil</option>
              <option value="Zelle">Zelle</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </div>

          {/* Cuentas destino del proveedor */}
          {paymentMethod !== 'Efectivo' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Cuenta Destino (Del Proveedor)</label>
              <select 
                className="input-premium w-full text-sm py-2.5"
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
              >
                <option value="">-- Seleccionar Cuenta Destino --</option>
                {!loadingAccounts && accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bank_name} - {acc.account_type} - {acc.account_number || acc.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campos adicionales de transferencia */}
          {paymentMethod !== 'Efectivo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Nro. Referencia</label>
                <input 
                  type="text" 
                  className="input-premium w-full text-sm font-mono"
                  placeholder="00001234"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Banco de Origen</label>
                <input 
                  type="text" 
                  className="input-premium w-full text-sm"
                  placeholder="Ej. Banesco"
                  value={originBank}
                  onChange={(e) => setOriginBank(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Observación / Concepto</label>
            <input 
              type="text" 
              className="input-premium w-full text-sm"
              placeholder="Ej. DIVISA o Abono Factura"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
        </div>

        {/* PIE DE PÁGINA / BOTONES (FIJOS AL FINAL DEL FORMULARIO) */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-border-main/40 mt-6 bg-white dark:bg-slate-900">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={paying || !currentRate}
            className="btn-primary text-xs py-2 px-4 cursor-pointer bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
          >
            {paying ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>
      </form>
    </div>
  );
};

