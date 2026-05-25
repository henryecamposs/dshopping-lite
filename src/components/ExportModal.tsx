// dShopping Lite - Componente ExportModal
// Popup premium para exportación corporativa de datos en PDF ejecutivo y libros Excel nativos (.xlsx)

import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Download, AlertCircle } from 'lucide-react';
import { useExchangeStore } from '../store/useExchangeStore';
import { Invoice, Provider } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: 'invoices' | 'providers';
  data: any[]; // Registros filtrados u obtenidos del store
  providersList: Provider[]; // Necesario para mapear RIFs de proveedores
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataType,
  data,
  providersList
}) => {
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [exporting, setExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Lógica de exportación a Excel nativo (.xlsx) mediante SheetJS
  const handleExportExcel = () => {
    setExporting(true);
    try {
      const activeRate = currentRate?.rate_value || 45.00;
      let worksheetData: any[] = [];
      let filename = '';

      if (dataType === 'invoices') {
        filename = `dShopping_Facturas_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Mapear campos de facturas para un reporte limpio
        worksheetData = data.map((inv: Invoice) => {
          const providerRif = providersList.find(p => p.id === inv.provider_id)?.rif || 'S/N';
          const localValue = inv.total_invoice * activeRate;
          return {
            'Proveedor': inv.provider_name || 'Desconocido',
            'RIF Proveedor': providerRif,
            'Número Factura': inv.invoice_number,
            'Número Control': inv.control_number,
            'Fecha Emisión': inv.invoice_date,
            'Días Crédito': inv.credit_days,
            'Fecha Vencimiento': inv.due_date,
            'Base Imponible ($)': Number(inv.base_taxable),
            'Base Exenta ($)': Number(inv.base_exempt),
            'IVA (%)': inv.iva_percentage,
            'IVA Importe ($)': Number(inv.iva_amount),
            'Total Neto ($)': Number(inv.total_invoice),
            'Tasa Cambiaria Hoy': activeRate,
            'Total Equivalente (Bs.)': Number(localValue.toFixed(2)),
            'Estado de Pago': inv.status === 'paid' ? 'PAGADO' : 'PENDIENTE'
          };
        });
      } else {
        filename = `dShopping_Proveedores_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Mapear campos de proveedores
        worksheetData = data.map((p: Provider) => ({
          'Razón Social / Nombre': p.name,
          'RIF Fiscal': p.rif,
          'Fecha de Registro': new Date(p.created_at).toLocaleDateString()
        }));
      }

      // Crear Libro de Excel
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, dataType === 'invoices' ? 'Facturas' : 'Proveedores');

      // Auto-ajustar anchos de columnas
      const maxColWidths = worksheetData.reduce((acc, row) => {
        Object.keys(row).forEach((key, colIndex) => {
          const cellLength = row[key] ? row[key].toString().length : 10;
          const keyLength = key.length;
          const currentMax = acc[colIndex] || 10;
          acc[colIndex] = Math.max(currentMax, cellLength, keyLength) + 3;
        });
        return acc;
      }, [] as number[]);

      ws['!cols'] = maxColWidths.map((w: number) => ({ wch: w }));

      // Descargar archivo binario
      XLSX.writeFile(wb, filename);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Excel generado exitosamente.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Exportación',
        text: err.message || 'No se pudo generar el archivo Excel.',
        confirmButtonColor: '#8b5cf6',
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
    } finally {
      setExporting(false);
    }
  };

  // Lógica de exportación a PDF Ejecutivo estructurado con jsPDF y jsPDF-AutoTable
  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const todayStr = new Date().toLocaleDateString();
      const activeRate = currentRate?.rate_value || 45.00;
      const isDark = document.documentElement.classList.contains('dark');
      
      // Estilo de marca corporativa (Violeta & Oro)
      const primaryColor: [number, number, number] = [139, 92, 246]; // #8b5cf6
      
      // Membrete
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('dShopping Lite — Reporte Administrativo Corporativo', 15, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha del Reporte: ${todayStr}  |  Tasa Cambiaria del Día: ${activeRate.toFixed(2)} Bs./USD`, 210, 15);

      // Cuerpo del PDF
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(dataType === 'invoices' ? 'BALANCE DETALLADO DE CUENTAS POR PAGAR' : 'REGISTRO DE PROVEEDORES ASOCIADOS', 15, 34);

      if (dataType === 'invoices') {
        const tableHeaders = [[
          'Proveedor',
          'Nro. Factura',
          'Nro. Control',
          'Emisión',
          'Vencimiento',
          'Días',
          'Importe ($)',
          'Importe (Bs.)',
          'Estado'
        ]];

        const tableRows = data.map((inv: Invoice) => {
          const localVal = inv.total_invoice * activeRate;
          return [
            inv.provider_name || 'S/N',
            inv.invoice_number,
            inv.control_number,
            inv.invoice_date,
            inv.due_date,
            inv.credit_days,
            formatCurrencyUSD(inv.total_invoice),
            formatCurrencyLocal(localVal),
            inv.status === 'paid' ? 'PAGADO' : 'PENDIENTE'
          ];
        });

        // Totales consolidados
        const totalUSD = data.reduce((sum, inv) => sum + inv.total_invoice, 0);
        const totalBs = totalUSD * activeRate;
        const pendingUSD = data.filter(i => i.status === 'pending').reduce((sum, inv) => sum + inv.total_invoice, 0);
        const pendingBs = pendingUSD * activeRate;

        autoTable(doc, {
          head: tableHeaders,
          body: tableRows,
          startY: 40,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: {
            6: { halign: 'right', fontStyle: 'bold' },
            7: { halign: 'right', fontStyle: 'bold' },
            8: { halign: 'center' }
          }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 8;
        
        // Renderizar caja de totales
        doc.setFillColor(243, 244, 246);
        doc.rect(15, finalY, 267, 18, 'F');
        doc.setDrawColor(209, 213, 219);
        doc.rect(15, finalY, 267, 18, 'D');

        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL FACTURAS EXPORTADAS: ${data.length}`, 20, finalY + 7);
        doc.text(`TOTAL CONSOLIDADO ($): ${formatCurrencyUSD(totalUSD)}`, 20, finalY + 13);

        doc.text(`PENDIENTES POR PAGAR ($): ${formatCurrencyUSD(pendingUSD)}`, 140, finalY + 7);
        doc.text(`PENDIENTES POR PAGAR (Bs.): ${formatCurrencyLocal(pendingBs)}`, 140, finalY + 13);

      } else {
        const tableHeaders = [['Razón Social / Nombre', 'RIF Fiscal', 'Fecha de Creación']];
        const tableRows = data.map((p: Provider) => [
          p.name,
          p.rif,
          new Date(p.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
          head: tableHeaders,
          body: tableRows,
          startY: 40,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          styles: { fontSize: 9.5 }
        });
      }

      // Descargar PDF
      doc.save(`dShopping_${dataType === 'invoices' ? 'Facturas' : 'Proveedores'}_${new Date().toISOString().split('T')[0]}.pdf`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'PDF Ejecutivo exportado con éxito.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error en PDF',
        text: err.message || 'No se pudo estructurar el reporte PDF.',
        confirmButtonColor: '#8b5cf6',
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (format === 'excel') {
      handleExportExcel();
    } else {
      handleExportPDF();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Tarjeta Modal */}
      <div className="glass-card w-full max-w-md rounded-3xl overflow-hidden border border-primary/25 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border-main">
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Download size={20} className="text-primary" />
            <span>Exportar {dataType === 'invoices' ? 'Facturas' : 'Proveedores'}</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-6">
          
          {/* Alerta de registros activos */}
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-2xl p-4 flex gap-3 items-start">
            <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-text-main">
                Registros seleccionados: {data.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                Se aplicarán los filtros de búsqueda activos actualmente en la tabla del panel principal.
              </p>
            </div>
          </div>

          {/* Formato de salida */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Formato de Descarga
            </label>
            <div className="grid grid-cols-2 gap-4">
              
              <button
                onClick={() => setFormat('excel')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  format === 'excel'
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold shadow-md shadow-emerald-500/5'
                    : 'border-border-main hover:bg-muted/10 text-muted-foreground'
                }`}
              >
                <FileSpreadsheet size={32} className="mb-2" />
                <span className="text-xs">Libro Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  format === 'pdf'
                    ? 'border-primary/40 bg-primary/5 text-primary font-bold shadow-md shadow-primary/5'
                    : 'border-border-main hover:bg-muted/10 text-muted-foreground'
                }`}
              >
                <FileText size={32} className="mb-2" />
                <span className="text-xs">PDF Ejecutivo (.pdf)</span>
              </button>

            </div>
          </div>

        </div>

        {/* Acciones del pie */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-muted/20 border-t border-border-main">
          <button
            onClick={onClose}
            className="btn-secondary py-2 text-xs"
            disabled={exporting}
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            className="btn-primary py-2 text-xs"
            disabled={exporting || data.length === 0}
          >
            {exporting ? 'Generando...' : 'Exportar Documento'}
          </button>
        </div>

      </div>
    </div>
  );
};

