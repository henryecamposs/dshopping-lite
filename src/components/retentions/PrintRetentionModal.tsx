import React from 'react';
import { X, Printer, ArrowLeft, Download, ShieldCheck, FileText, Calendar, Percent } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useExchangeStore } from '../../store/useExchangeStore';
import { Invoice, InvoiceRetention, Provider } from '../../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface PrintRetentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  retention: InvoiceRetention | null;
  invoice: Invoice | null;
  provider: Provider | null;
}

export const PrintRetentionModal: React.FC<PrintRetentionModalProps> = ({
  isOpen,
  onClose,
  retention,
  invoice,
  provider
}) => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();

  if (!isOpen || !retention || !invoice || !provider) return null;

  const activeRate = currentRate?.rate_value || invoice.exchange_rate_at_invoice;
  const localTotalInvoice = invoice.total_invoice * activeRate;
  const localBaseTaxable = invoice.base_taxable * activeRate;
  const localBaseExempt = invoice.base_exempt * activeRate;
  const localIvaAmount = invoice.iva_amount * activeRate;
  const localRetentionAmount = retention.retention_amount * activeRate;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const todayStr = new Date().toLocaleDateString();
      const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
      const slateDark: [number, number, number] = [15, 23, 42];
      const borderGray: [number, number, number] = [203, 213, 225];

      // Banner Superior
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 215.9, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(company?.name?.toUpperCase() || 'AGENTE DE RETENCIÓN', 15, 10);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${company?.rif || 'S/N'} • Agente de Retención Especial del IVA`, 15, 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(
        retention.type === 'IVA' 
          ? 'COMPROBANTE DE RETENCIÓN DE IVA' 
          : 'COMPROBANTE DE RETENCIÓN DE ISLR', 
        130, 14
      );

      // Metadatos
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFontSize(9);
      
      doc.setFont('helvetica', 'bold');
      doc.text('COMPROBANTE NRO:', 15, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(retention.correlative_number || 'S/N (ISLR)', 52, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('FECHA EMISIÓN:', 130, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(retention.created_at).toLocaleDateString('es-VE'), 160, 36);

      // Datos Agente y Sujeto
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, 42, 200.9, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('1. AGENTE DE RETENCIÓN:', 15, 48);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre/Razón Social: ${company?.name}`, 15, 54);
      doc.text(`RIF: ${company?.rif}`, 15, 59);

      doc.setFont('helvetica', 'bold');
      doc.text('2. SUJETO RETENIDO (PROVEEDOR):', 115, 48);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre/Razón Social: ${provider.name}`, 115, 54);
      doc.text(`RIF: ${provider.rif}`, 115, 59);

      doc.line(15, 66, 200.9, 66);

      // Tabla de Operaciones
      let tableHeaders: string[][];
      let tableRows: string[][];

      if (retention.type === 'IVA') {
        tableHeaders = [[
          'Nro. Factura',
          'Nro. Control',
          'Fecha Factura',
          'Total Factura (Bs.)',
          'Base Imponible (Bs.)',
          'IVA %',
          'IVA (Bs.)',
          'Ret. %',
          'Retenido (Bs.)'
        ]];
        
        tableRows = [[
          invoice.invoice_number,
          invoice.control_number,
          invoice.invoice_date,
          localTotalInvoice.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          localBaseTaxable.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `${invoice.iva_percentage}%`,
          localIvaAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `${retention.retention_percentage}%`,
          localRetentionAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })
        ]];
      } else {
        tableHeaders = [[
          'Nro. Factura',
          'Fecha Factura',
          'Concepto de ISLR',
          'Total Factura (Bs.)',
          'Base Imponible (Bs.)',
          'Ret. %',
          'Retenido (Bs.)',
          'Retenido (USD)'
        ]];
        
        tableRows = [[
          invoice.invoice_number,
          invoice.invoice_date,
          retention.islr_concept || 'Servicios',
          localTotalInvoice.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          localBaseTaxable.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `${retention.retention_percentage}%`,
          localRetentionAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `$ ${retention.retention_amount.toFixed(2)}`
        ]];
      }

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 72,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          halign: 'center'
        },
        columnStyles: {
          0: { fontStyle: 'bold' }
        }
      });

      const tableEndY = (doc as any).lastAutoTable.finalY;

      // Caja de equivalencias y totales
      const boxY = tableEndY + 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, boxY, 185.9, 18, 'F');
      doc.rect(15, boxY, 185.9, 18, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('RESUMEN DE OPERACIÓN FISCAL (DIVISAS):', 20, boxY + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        `Total Factura: $ ${invoice.total_invoice.toFixed(2)} | ` +
        `IVA Factura: $ ${invoice.iva_amount.toFixed(2)} | ` +
        `Monto Retenido: $ ${retention.retention_amount.toFixed(2)}`,
        20, boxY + 12
      );

      doc.text(
        `Tasa de cambio del día de facturación: ${activeRate.toFixed(2)} Bs./$`,
        125, boxY + 6
      );

      // Firmas
      const signatureY = boxY + 45;
      doc.line(30, signatureY, 80, signatureY);
      doc.text('Por Agente de Retención', 40, signatureY + 5);

      doc.line(135, signatureY, 185, signatureY);
      doc.text('Por Sujeto Retenido', 148, signatureY + 5);

      // Pie de página
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Este comprobante cumple con las formalidades del SENIAT aplicables a agentes de retención.', 15, 265);
      doc.text(`Generado digitalmente por dShopping Lite el: ${todayStr}`, 15, 269);

      doc.save(`Comprobante_Retencion_${retention.type}_${retention.correlative_number || invoice.invoice_number}.pdf`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Comprobante PDF exportado con éxito.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
    } catch (err: any) {
      Swal.fire('Error', 'No se pudo exportar el comprobante a PDF: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 border border-border-main dark:border-indigo-950 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Barra de Acciones Superior */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border-main">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-xl transition-colors cursor-pointer border border-border-main flex items-center justify-center"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-text-main">
                Comprobante de Retención SENIAT
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Previsualización formal antes de la descarga o impresión.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="btn-secondary py-2 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              Exportar PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary py-2 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer size={14} />
              Imprimir Documento
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* LIENZO DE DIBUJO CARTA */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 md:p-8 bg-slate-100 dark:bg-slate-950/20">
          
          <div className="print-document-sheet mx-auto w-full max-w-[215.9mm] bg-white text-slate-800 p-8 md:p-10 border border-slate-200 shadow-lg rounded-2xl relative overflow-hidden font-sans">
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 to-primary"></div>

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl font-black text-indigo-900 tracking-tight">{company?.name?.toUpperCase()}</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">RIF: {company?.rif}</p>
                <p className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">Agente de Retención Especial de Impuestos</p>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
                  RETENCIÓN {retention.type}
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Comprobante: <span className="font-mono">{retention.correlative_number || 'S/N (ISLR)'}</span>
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Fecha: {new Date(retention.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Datos Sujeto y Agente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">1. AGENTE DE RETENCIÓN</p>
                <p className="font-bold text-slate-800">{company?.name}</p>
                <p className="text-slate-500 font-mono">RIF: {company?.rif}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">2. SUJETO RETENIDO (PROVEEDOR)</p>
                <p className="font-bold text-slate-800">{provider.name}</p>
                <p className="text-slate-500 font-mono">RIF: {provider.rif}</p>
              </div>
            </div>

            {/* Detalles de la Operación en una Tabla de Impuestos */}
            <div className="py-6">
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-3">3. DETALLE DE COMPENSACIÓN FISCAL (EN BOLÍVARES)</p>
              
              <table className="w-full text-xs text-left text-slate-700 border border-slate-200 rounded-xl overflow-hidden">
                <thead className="text-[9px] uppercase font-bold bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Factura / Control</th>
                    <th className="px-3 py-2.5 text-right">Total Factura (Bs.)</th>
                    <th className="px-3 py-2.5 text-right">Base Imponible (Bs.)</th>
                    <th className="px-3 py-2.5 text-center">Tasa %</th>
                    <th className="px-3 py-2.5 text-right">Impuesto (Bs.)</th>
                    <th className="px-3 py-2.5 text-center">Ret. %</th>
                    <th className="px-3 py-2.5 text-right">Retenido (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-3 font-semibold">
                      <p>{invoice.invoice_number}</p>
                      <span className="text-[9px] font-mono text-slate-400">Ctrl: {invoice.control_number}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium">{formatCurrencyLocal(localTotalInvoice)}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">{formatCurrencyLocal(localBaseTaxable)}</td>
                    <td className="px-3 py-3 text-center font-mono">{retention.type === 'IVA' ? `${invoice.iva_percentage}%` : '-'}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">
                      {retention.type === 'IVA' ? formatCurrencyLocal(localIvaAmount) : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-indigo-700">{retention.retention_percentage}%</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-indigo-700">{formatCurrencyLocal(localRetentionAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totalizador en Divisas */}
            <div className="bg-slate-50 border-l-4 border-indigo-600 p-5 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Monto Equivalente Retenido (USD)</p>
                <p className="text-xl font-black text-slate-800 mt-1 font-mono">{formatCurrencyUSD(retention.retention_amount)}</p>
              </div>
              <div className="text-right text-[9px] text-slate-400 leading-normal font-semibold font-mono">
                <p>Base Imponible: $ {invoice.base_taxable.toFixed(2)}</p>
                <p>Tasa Cambiaria Aplicada: {activeRate.toFixed(2)} Bs./$</p>
              </div>
            </div>

            {/* Área de Firmas */}
            <div className="grid grid-cols-2 gap-12 mt-20 pt-10 text-[10px] text-center text-slate-400 font-bold">
              <div>
                <div className="border-t border-slate-200 w-44 mx-auto pt-2.5">
                  Por Agente de Retención
                </div>
              </div>
              <div>
                <div className="border-t border-slate-200 w-44 mx-auto pt-2.5">
                  Por Sujeto Retenido
                </div>
              </div>
            </div>

            {/* Pie de Página */}
            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 text-[8px] text-slate-400 font-semibold leading-normal">
              <div>
                <p className="text-slate-500">dShopping Lite — Control Cambiario Inteligente</p>
                <p>Este comprobante es soporte legal formal de amortizaciones tributarias ante el Fisco Nacional.</p>
              </div>
              <div className="text-right">
                <p>Impreso el: {new Date().toLocaleString()}</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

