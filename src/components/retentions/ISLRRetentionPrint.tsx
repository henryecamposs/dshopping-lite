import React from 'react';
import { InvoiceRetention } from '../../types';

interface ISLRPrintProps {
  retention: InvoiceRetention;
  companyInfo: {
    name: string;
    rif: string;
  };
  providerInfo: {
    name: string;
    rif: string;
  };
}

export const ISLRRetentionPrint: React.FC<ISLRPrintProps> = ({ retention, companyInfo, providerInfo }) => {
  return (
    <div className="hidden print:block p-8 font-sans text-black bg-white w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase">{companyInfo.name}</h1>
        <p className="text-lg">RIF: {companyInfo.rif}</p>
        <h2 className="text-xl font-bold mt-4 uppercase border-b-2 border-black pb-2">
          Comprobante de Retención de Impuesto Sobre La Renta (ISLR)
        </h2>
      </div>

      <div className="flex justify-between mb-8 border border-black p-4">
        <div>
          <p><strong>Nro. Comprobante:</strong> {retention.correlative_number || 'S/N'}</p>
          <p><strong>Fecha de Emisión:</strong> {new Date(retention.created_at).toLocaleDateString('es-VE')}</p>
        </div>
        <div>
          <p><strong>Agente de Retención:</strong> {companyInfo.name}</p>
          <p><strong>RIF Agente:</strong> {companyInfo.rif}</p>
        </div>
      </div>

      <div className="mb-8 border border-black p-4">
        <h3 className="font-bold mb-2">Datos del Beneficiario (Sujeto Retenido)</h3>
        <p><strong>Nombre o Razón Social:</strong> {providerInfo.name}</p>
        <p><strong>RIF:</strong> {providerInfo.rif}</p>
      </div>

      <table className="w-full border-collapse border border-black mb-16 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-black p-2">Concepto</th>
            <th className="border border-black p-2">Base Imponible</th>
            <th className="border border-black p-2">% Retención</th>
            <th className="border border-black p-2">Monto Retenido</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 text-center">{retention.islr_concept || 'ISLR'}</td>
            <td className="border border-black p-2 text-right">Bs. -- (Mock)</td>
            <td className="border border-black p-2 text-center">{retention.retention_percentage}%</td>
            <td className="border border-black p-2 text-right font-bold">Bs. {retention.retention_amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-around mt-16 pt-16">
        <div className="text-center">
          <div className="border-t border-black w-48 mx-auto mt-8 pt-2">
            <strong>Firma Agente de Retención</strong>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-48 mx-auto mt-8 pt-2">
            <strong>Firma Beneficiario</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
