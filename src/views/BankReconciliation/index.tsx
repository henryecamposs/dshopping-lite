import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { usePaymentStore } from '../../store/paymentStore';
import { useExchangeStore } from '../../store/exchangeStore';
import { Landmark, ArrowRightLeft, FileText, CheckCircle2 } from 'lucide-react';

export const BankReconciliation: React.FC = () => {
  const { company } = useAuthStore();
  const { providers, invoices, fetchProviders, fetchInvoices } = useInvoiceStore();
  const { payments, fetchPaymentsByProvider, loading: paymentsLoading } = usePaymentStore();
  const { formatCurrencyUSD } = useExchangeStore();

  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  
  // Consolidation state
  const [statement, setStatement] = useState<any[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    if (company?.id) {
      fetchProviders(company.id);
      fetchInvoices(company.id);
    }
  }, [company?.id, fetchProviders, fetchInvoices]);

  useEffect(() => {
    if (company?.id && selectedProviderId) {
      fetchPaymentsByProvider(company.id, selectedProviderId);
    }
  }, [company?.id, selectedProviderId, fetchPaymentsByProvider]);

  useEffect(() => {
    if (!selectedProviderId) {
      setStatement([]);
      setTotalDebt(0);
      return;
    }

    const providerInvoices = invoices.filter(inv => inv.provider_id === selectedProviderId);
    
    // Create chronological ledger
    let ledger: any[] = [];

    providerInvoices.forEach(inv => {
      ledger.push({
        id: inv.id,
        date: inv.invoice_date,
        type: 'INVOICE',
        reference: inv.invoice_number,
        description: `Factura ${inv.invoice_number} (Ctrl: ${inv.control_number})`,
        debit: inv.total_invoice, // Aumenta la deuda
        credit: 0,
        rawDate: new Date(inv.invoice_date).getTime()
      });
    });

    payments.forEach(pay => {
      ledger.push({
        id: pay.id,
        date: pay.payment_date,
        type: 'PAYMENT',
        reference: pay.reference_number || 'S/N',
        description: `Pago (${pay.payment_method}) - ${pay.observation || ''}`,
        debit: 0,
        credit: pay.currency === 'USD' ? pay.amount_paid : 0, // Para simplificar, asumimos que si es VES ya fue convertido o usamos el monto referencial (Idealmente, cruzar con exchange_rate_id)
        rawDate: new Date(pay.payment_date).getTime()
      });
    });

    // Ordenar cronológicamente
    ledger.sort((a, b) => a.rawDate - b.rawDate);

    // Calcular saldos continuos
    let balance = 0;
    const finalLedger = ledger.map(entry => {
      balance = balance + entry.debit - entry.credit;
      return { ...entry, balance };
    });

    setStatement(finalLedger);
    setTotalDebt(balance);

  }, [selectedProviderId, invoices, payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Landmark className="text-primary" />
            Estado de Cuenta Corriente
          </h2>
          <p className="text-muted-foreground text-sm">Conciliación bancaria y revisión de saldos por proveedor.</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 border border-border-main">
        <div className="max-w-md mb-8">
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Seleccione un Proveedor</label>
          <select
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(e.target.value)}
            className="input-premium w-full text-base"
          >
            <option value="">-- Buscar Proveedor --</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.rif})</option>
            ))}
          </select>
        </div>

        {selectedProviderId ? (
          <div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-1">
                <p className="text-xs font-bold text-primary uppercase">Saldo Pendiente (Deuda Total)</p>
                <p className={`text-3xl font-black font-mono mt-1 ${totalDebt <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrencyUSD(totalDebt)}
                </p>
              </div>
            </div>

            {paymentsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando transacciones...</div>
            ) : statement.length === 0 ? (
              <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
                <ArrowRightLeft className="mx-auto text-muted-foreground mb-2" size={40} />
                <p className="text-muted-foreground text-sm">No hay facturas ni pagos registrados para este proveedor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Referencia</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-right">Cargo (Facturado)</th>
                      <th className="px-4 py-3 text-right">Abono (Pagado)</th>
                      <th className="px-4 py-3 text-right rounded-tr-xl">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((entry, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="border-b border-border-main/50 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {entry.type === 'INVOICE' ? (
                            <span className="flex items-center gap-1 text-rose-500 font-semibold text-xs bg-rose-500/10 px-2 py-1 rounded-md w-max">
                              <FileText size={12} /> FACTURA
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-md w-max">
                              <CheckCircle2 size={12} /> PAGO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{entry.reference}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.description}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-500">
                          {entry.debit > 0 ? formatCurrencyUSD(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-500">
                          {entry.credit > 0 ? formatCurrencyUSD(entry.credit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {formatCurrencyUSD(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border-main rounded-2xl">
            Seleccione un proveedor de la lista superior para visualizar su estado de cuenta corriente.
          </div>
        )}
      </div>
    </div>
  );
};
