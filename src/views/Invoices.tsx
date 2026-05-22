// dShopping Lite - Vista de Gestión de Facturas
// Coordinación de la lista y el formulario de facturas con auto-cálculos financieros

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { InvoiceForm } from '../components/InvoiceForm';
import { Plus, Receipt, Search, FileText, CheckCircle, Trash2, Calendar, Printer, Edit } from 'lucide-react';
import { Invoice } from '../types';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const Invoices: React.FC = () => {
  const { company } = useAuthStore();
  const { formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();
  const { invoices, providers, fetchInvoices, fetchProviders, updateInvoiceStatus, deleteInvoice, loading } = useInvoiceStore();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (company?.id) {
      fetchInvoices(company.id);
      fetchProviders(company.id);
    }
  }, [company?.id, fetchInvoices, fetchProviders]);

  const handleMarkAsPaid = async (id: string, currentStatus: 'pending' | 'paid') => {
    const nextStatus = currentStatus === 'pending' ? 'paid' : 'pending';
    const isDark = document.documentElement.classList.contains('dark');
    
    Swal.fire({
      title: nextStatus === 'paid' ? '¿Marcar como Pagada?' : '¿Marcar como Pendiente?',
      text: nextStatus === 'paid' 
        ? 'Esta factura se marcará como pagada y se descontará del balance de deudas pendientes.'
        : 'Esta factura volverá a estar en estado pendiente de pago.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6', // Violeta
      cancelButtonColor: '#4b5563', // Gris
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await updateInvoiceStatus(id, nextStatus);
        if (success) {
          Swal.fire({
            title: '¡Actualizado!',
            text: 'El estado de la factura ha sido modificado.',
            icon: 'success',
            confirmButtonColor: '#8b5cf6',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    Swal.fire({
      title: '¿Eliminar Factura?',
      text: '¿Está seguro de que desea ELIMINAR esta factura? Esta operación no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', // Rojo destructivo
      cancelButtonColor: '#4b5563', // Gris
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await deleteInvoice(id);
        if (success) {
          Swal.fire({
            title: '¡Eliminada!',
            text: 'La factura ha sido eliminada del sistema.',
            icon: 'success',
            confirmButtonColor: '#8b5cf6',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    });
  };

  // Generador dinámico en caliente del PDF para una factura individual
  const handlePrintSingleInvoice = (inv: Invoice) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const isPaid = inv.status === 'paid';
    
    // Configuración de Colores y Fuentes Premium (Violeta y Oro)
    const purpleColor = [139, 92, 246]; // primary #8b5cf6
    const goldColor = [217, 119, 6]; // secondary #d97706
    const darkGray = [31, 41, 55];
    const lightGray = [107, 114, 128];

    // --- ENCABEZADO ---
    doc.setFillColor(purpleColor[0], purpleColor[1], purpleColor[2]);
    doc.rect(0, 0, 216, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('dShopping Lite', 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistema de Cuentas por Pagar Corporativo', 15, 24);

    // Marca de agua de pago o pendiente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (isPaid) {
      doc.setFillColor(16, 185, 129); // Esmeralda
      doc.rect(155, 10, 45, 15, 'F');
      doc.text('PAGADA', 167, 19);
    } else {
      doc.setFillColor(245, 158, 11); // Ámbar
      doc.rect(155, 10, 45, 15, 'F');
      doc.text('PENDIENTE', 162, 19);
    }

    // --- DATOS DE LA EMPRESA Y COMPROMISO ---
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INFORMACIÓN DE LA EMPRESA', 15, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Empresa: ${company?.name || 'Empresa Activa'}`, 15, 54);
    doc.text(`RIF: ${company?.rif || 'RIF'}`, 15, 60);

    // DATOS DE LA FACTURA
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE LA FACTURA', 120, 48);

    doc.setFont('helvetica', 'normal');
    doc.text(`Nro. Factura: ${inv.invoice_number}`, 120, 54);
    doc.text(`Nro. Control: ${inv.control_number}`, 120, 60);
    doc.text(`Fecha Emisión: ${inv.invoice_date}`, 120, 66);
    doc.text(`Fecha Vencimiento: ${inv.due_date}`, 120, 72);
    doc.text(`Condición: ${inv.credit_days} días de crédito`, 120, 78);

    // DIVISOR
    doc.setDrawColor(209, 213, 219);
    doc.line(15, 84, 201, 84);

    // DATOS DEL PROVEEDOR
    doc.setFont('helvetica', 'bold');
    doc.text('PROVEEDOR BENEFICIARIO', 15, 92);

    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre / Razón Social: ${inv.provider_name}`, 15, 98);
    const providerRif = providers.find(p => p.id === inv.provider_id)?.rif || 'S/N';
    doc.text(`RIF: ${providerRif}`, 15, 104);

    // TABLA DE IMPORTES FINANCIEROS (USD)
    const tableHeaders = [['Concepto', 'Base Imponible / Porcentaje', 'Importe ($ USD)']];
    const tableData = [
      ['Base Imponible (Gravable)', formatCurrencyUSD(inv.base_taxable), formatCurrencyUSD(inv.base_taxable)],
      ['Base Exenta (No Gravable)', formatCurrencyUSD(inv.base_exempt), formatCurrencyUSD(inv.base_exempt)],
      [`IVA Calculado (${inv.iva_percentage}%)`, `${inv.iva_percentage}%`, formatCurrencyUSD(inv.iva_amount)],
      ['TOTAL NETO (USD)', '', formatCurrencyUSD(inv.total_invoice)]
    ];

    (doc as any).autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 112,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: purpleColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 56, halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- CONVERSIÓN EN MONEDA LOCAL ---
    doc.setFillColor(243, 244, 246);
    doc.rect(15, finalY, 186, 25, 'F');
    doc.setDrawColor(purpleColor[0], purpleColor[1], purpleColor[2]);
    doc.rect(15, finalY, 186, 25, 'D');

    doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL EQUIVALENTE EN MONEDA LOCAL (VEB / Bs.)', 20, finalY + 8);

    const localValue = inv.total_invoice * inv.exchange_rate_at_invoice;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(14);
    doc.text(formatCurrencyLocal(localValue), 20, finalY + 18);

    doc.setFontSize(9);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(`Tasa de Cambio aplicada: ${inv.exchange_rate_at_invoice.toFixed(2)} Bs. / USD (registrada el ${inv.invoice_date})`, 120, finalY + 16);

    // --- PIE DE PÁGINA ---
    doc.setFontSize(8);
    doc.text('dShopping Lite — Documento de uso interno y soporte administrativo para conciliaciones de tesorería.', 15, 270);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 150, 270);

    doc.save(`Recibo_Factura_${inv.invoice_number}_${inv.provider_name?.replace(/\s+/g, '_')}.pdf`);

    // Mostrar SweetAlert2 Toast de Éxito
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Recibo PDF Generado',
      showConfirmButton: false,
      timer: 2000,
      background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    });
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.control_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFormOpen = isCreating || invoiceToEdit !== null;

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Registro de Facturas</h2>
          <p className="text-slate-400 text-sm">Controle sus facturas recibidas y los plazos de vencimiento fiscal.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            Cargar Factura
          </button>
        )}
      </div>

      {/* RENDERIZADO CONDICIONAL DE FORMULARIO U LISTA */}
      {isFormOpen ? (
        <InvoiceForm
          invoiceToEdit={invoiceToEdit}
          onSuccess={() => {
            setIsCreating(false);
            setInvoiceToEdit(null);
            if (company?.id) fetchInvoices(company.id);
          }}
          onCancel={() => {
            setIsCreating(false);
            setInvoiceToEdit(null);
          }}
        />
      ) : (
        <div className="glass-card rounded-3xl p-6">
          {/* BUSCADOR */}
          <div className="relative flex items-center mb-6">
            <span className="absolute left-4 text-slate-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium w-full pl-11 text-sm"
              placeholder="Buscar por Proveedor, Nro. Factura o Control..."
            />
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
              <Receipt className="mx-auto text-muted-foreground mb-2" size={40} />
              <p className="text-muted-foreground text-sm">No se encontraron registros de facturas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-text-main/85 dark:text-slate-350">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border-main">
                  <tr>
                    <th className="px-6 py-4 font-bold">Proveedor</th>
                    <th className="px-6 py-4 font-bold">Factura</th>
                    <th className="px-6 py-4 font-bold">Emisión / Crédito</th>
                    <th className="px-6 py-4 font-bold">Vencimiento</th>
                    <th className="px-6 py-4 font-bold text-right">Importe ($)</th>
                    <th className="px-6 py-4 font-bold text-right">Importe (Bs.)</th>
                    <th className="px-6 py-4 font-bold text-center">Estado</th>
                    <th className="px-6 py-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main bg-muted/10">
                  {filteredInvoices.map((inv) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isExpired = inv.due_date < todayStr && inv.status === 'pending';
                    const localVal = inv.total_invoice * inv.exchange_rate_at_invoice;

                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-text-main">
                          <p className="truncate max-w-[200px]">{inv.provider_name}</p>
                          <span className="text-[10px] font-mono text-primary">Control: {inv.control_number}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium">{inv.invoice_number}</td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs">{inv.invoice_date}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{inv.credit_days} días de crédito</p>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              isExpired 
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                                : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              {inv.due_date}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-primary">
                          {formatCurrencyUSD(inv.total_invoice)}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                          {/* MONTO CAMBIARIO REGISTRADO EN LA FACTURA */}
                          {formatCurrencyLocal(localVal)}
                          <p className="text-[9px] text-muted-foreground font-semibold">Tasa: {inv.exchange_rate_at_invoice.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleMarkAsPaid(inv.id, inv.status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer transition-all border ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintSingleInvoice(inv)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer inline-flex"
                              title="Imprimir Factura (PDF)"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => setInvoiceToEdit(inv)}
                              className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer inline-flex"
                              title="Editar Factura"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="p-2 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer inline-flex"
                              title="Eliminar Factura"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
