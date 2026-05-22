// dShopping Lite - Componente PrintPreviewModal
// Visualización de la factura en HTML de alta fidelidad previa a la impresión física del documento

import React from 'react';
import { X, Printer, ArrowLeft, Receipt, DollarSign, Calendar, Clock, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { Invoice, Provider } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  providers: Provider[];
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  providers
}) => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();

  if (!isOpen || !invoice) return null;

  const provider = providers.find(p => p.id === invoice.provider_id);
  const activeRate = currentRate?.rate_value || invoice.exchange_rate_at_invoice;
  const localVal = invoice.total_invoice * activeRate;
  const isPaid = invoice.status === 'paid';

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
      const timeStr = new Date().toLocaleTimeString();

      const primaryColor: [number, number, number] = [139, 92, 246]; // Violeta
      const slateDark: [number, number, number] = [30, 41, 59];
      const grayLight: [number, number, number] = [248, 250, 252];
      const borderGray: [number, number, number] = [226, 232, 240];

      // 1. Violet Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 215.9, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('dShopping Lite', 15, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Gestión de Cuentas por Pagar', 15, 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('COMPROBANTE DIGITAL', 155, 15);

      // 2. Issuer Info & Invoice metadata
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('EMISOR:', 15, 36);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Empresa: ${company?.name || 'Empresa Activa'}`, 15, 42);
      doc.text(`RIF: ${company?.rif || 'S/N'}`, 15, 47);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DETALLES DE FACTURA:', 120, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Nro. Factura: ${invoice.invoice_number}`, 120, 42);
      doc.text(`Nro. Control: ${invoice.control_number}`, 120, 47);

      doc.text('Estado:', 120, 52);
      if (isPaid) {
        doc.setFillColor(16, 185, 129);
        doc.rect(133, 49, 18, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('PAGADA', 135.5, 52.2);
      } else {
        doc.setFillColor(245, 158, 11);
        doc.rect(133, 49, 21, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('PENDIENTE', 134.5, 52.2);
      }

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // 3. Beneficiary Provider Box
      doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
      doc.rect(15, 58, 185.9, 20, 'F');
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, 58, 185.9, 20, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('PROVEEDOR BENEFICIARIO', 20, 63);

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFontSize(10);
      doc.text(invoice.provider_name || 'Desconocido', 20, 68);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${provider?.rif || 'S/N'}`, 20, 73);

      // 4. Operational Dates Grid
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, 84, 200.9, 84);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('FECHA EMISIÓN', 15, 89);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(invoice.invoice_date, 15, 94);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('DÍAS CRÉDITO', 65, 89);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`${invoice.credit_days} días`, 65, 94);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('FECHA VENCIMIENTO', 115, 89);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(invoice.due_date, 115, 94);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TASA APLICADA', 165, 89);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`${activeRate.toFixed(2)} Bs./$`, 165, 94);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, 98, 200.9, 98);

      // 5. Financial Items Table using autoTable
      const tableHeaders = [['Concepto Financiero', 'Porcentaje / Tasa', 'Importe ($ USD)']];
      const tableRows = [
        ['Base Imponible (Monto Gravado)', '-', formatCurrencyUSD(invoice.base_taxable)],
        ['Base Exenta (Monto No Gravado)', '-', formatCurrencyUSD(invoice.base_exempt)],
        ['Impuesto al Valor Agregado (IVA)', `${invoice.iva_percentage}%`, formatCurrencyUSD(invoice.iva_amount)],
        ['TOTAL NETO RECONOCIDO', '-', formatCurrencyUSD(invoice.total_invoice)]
      ];

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 102,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 45.9, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === 3) {
            data.cell.styles.fillColor = [243, 244, 246];
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 2) {
              data.cell.styles.textColor = primaryColor;
            }
          }
        }
      });

      const tableEndY = (doc as any).lastAutoTable.finalY;

      // 6. Moneda Local Equivalent Box
      const localBoxY = tableEndY + 8;
      doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
      doc.rect(15, localBoxY, 185.9, 20, 'F');
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, localBoxY, 2, 20, 'F');

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, localBoxY, 185.9, 20, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL EQUIVALENTE EN MONEDA LOCAL', 20, localBoxY + 5);

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(formatCurrencyLocal(localVal), 20, localBoxY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Cálculo basado en tasa del día actual.', 140, localBoxY + 7);
      doc.text(`Equivalencia a tasa: ${activeRate.toFixed(2)} Bs./$`, 140, localBoxY + 12);

      // 7. Footer
      const footerY = 260;
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, footerY - 5, 200.9, footerY - 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('dShopping Lite — Control Cambiario Inteligente', 15, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Documento de uso interno, soporte para auditorías contables y tesorería.', 15, footerY + 4);

      doc.setFont('helvetica', 'italic');
      doc.text(`Descargado el: ${todayStr} ${timeStr}`, 145, footerY);

      doc.save(`Factura_${invoice.invoice_number}.pdf`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'PDF Comprobante descargado con éxito.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Exportación',
        text: err.message || 'No se pudo generar el archivo PDF.',
        confirmButtonColor: '#8b5cf6',
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm">
      
      {/* Caja contenedora general del Modal */}
      <div className="relative bg-white dark:bg-slate-900 border border-border-main dark:border-indigo-950 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh] animate-in zoom-in-95 duration-250">
        
        {/* Barra de Acciones Superior (Oculta al imprimir) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border-main">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-xl transition-colors cursor-pointer border border-border-main flex items-center justify-center"
              title="Volver al panel"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-text-main">
                Vista Previa de Impresión
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Revise el formato del comprobante antes de enviarlo a la impresora.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="btn-secondary py-2 text-xs flex items-center gap-2 cursor-pointer animate-in fade-in duration-200"
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

        {/* Lienzo / Cuerpo que simula la Hoja de Papel Carta (Dimensiones Letter) */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 md:p-8 bg-slate-100 dark:bg-slate-950/20">
          
          {/* Tarjeta de la Hoja Física (Clase que se aislará para la impresión física) */}
          <div className="print-document-sheet mx-auto w-full max-w-[215.9mm] bg-white text-slate-800 p-8 md:p-10 border border-slate-200 shadow-lg rounded-2xl relative overflow-hidden font-sans">
            
            {/* Elementos Estéticos Superiores */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-600 via-indigo-500 to-amber-500"></div>

            {/* Cabecera del Documento */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
              
              <div>
                <h1 className="text-2xl font-black text-indigo-900 tracking-tight">dShopping Lite</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Sistema de Gestión de Cuentas por Pagar</p>
                
                <div className="mt-4 text-xs space-y-1 text-slate-600">
                  <p><span className="font-bold">Empresa:</span> {company?.name || 'Empresa Activa'}</p>
                  <p><span className="font-bold">RIF:</span> {company?.rif || 'S/N'}</p>
                </div>
              </div>

              {/* Insignia de Estado y Nro. Factura */}
              <div className="text-right flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 text-white ${
                  isPaid ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  {isPaid ? 'PAGADA' : 'PENDIENTE'}
                </span>
                
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900 text-sm">FACTURA: <span className="font-mono">{invoice.invoice_number}</span></p>
                  <p className="font-semibold">Nro. Control: <span className="font-mono">{invoice.control_number}</span></p>
                </div>
              </div>

            </div>

            {/* Datos Operativos / Fechas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-200 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Fecha Emisión</p>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="font-mono">{invoice.invoice_date}</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Días de Crédito</p>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  <span>{invoice.credit_days} días</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Fecha Vencimiento</p>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="font-mono">{invoice.due_date}</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Tasa Aplicada</p>
                <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <DollarSign size={14} className="text-indigo-400" />
                  <span className="font-mono">{activeRate.toFixed(2)} Bs./$</span>
                </div>
              </div>
            </div>

            {/* Datos del Proveedor */}
            <div className="py-6 border-b border-slate-200 text-xs">
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">PROVEEDOR BENEFICIARIO</p>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
                <p className="font-bold text-slate-800 text-sm">{invoice.provider_name}</p>
                <p className="text-slate-500 font-semibold font-mono">RIF: {provider?.rif || 'S/N'}</p>
              </div>
            </div>

            {/* Tabla de Conceptos e Importes */}
            <div className="py-6">
              <table className="w-full text-xs text-left text-slate-700 border border-slate-200 rounded-xl overflow-hidden">
                <thead className="text-[10px] uppercase font-bold bg-slate-100 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Concepto Financiero</th>
                    <th className="px-4 py-3 text-right">Porcentaje</th>
                    <th className="px-4 py-3 text-right">Importe ($ USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-semibold">Base Imponible (Monto Gravado)</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrencyUSD(invoice.base_taxable)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">Base Exenta (Monto No Gravado)</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrencyUSD(invoice.base_exempt)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-500">Impuesto al Valor Agregado (IVA)</td>
                    <td className="px-4 py-3 text-right font-mono">{invoice.iva_percentage}%</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-500">{formatCurrencyUSD(invoice.iva_amount)}</td>
                  </tr>
                  <tr className="bg-indigo-50/30 text-indigo-950 font-bold text-sm border-t border-slate-200">
                    <td className="px-4 py-3 text-indigo-900">TOTAL NETO RECONOCIDO</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-900">{formatCurrencyUSD(invoice.total_invoice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Equivalente en Bolívares */}
            <div className="bg-slate-50 border-l-4 border-indigo-600 p-5 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL EQUIVALENTE EN MONEDA LOCAL</p>
                <p className="text-xl font-black text-slate-800 mt-1 font-mono">{formatCurrencyLocal(localVal)}</p>
              </div>
              <div className="text-right text-[10px] text-slate-400 leading-normal font-semibold">
                <p>Cálculo basado en tasa del día actual.</p>
                <p>Equivalencia a tasa: <span className="font-bold text-indigo-700 font-mono">{activeRate.toFixed(2)} Bs./$</span></p>
              </div>
            </div>

            {/* Firma y Notas al Pie */}
            <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 text-[9px] text-slate-400">
              <div className="text-center sm:text-left leading-normal font-semibold">
                <p className="font-bold text-slate-500">dShopping Lite — Control Cambiario Inteligente</p>
                <p>Documento de uso interno, soporte para auditorías contables y tesorería.</p>
              </div>
              <div className="text-right font-semibold">
                <p>Impreso el: {new Date().toLocaleString()}</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
