// dShopping Lite - Vista de Proveedores
// Gestión integral de proveedores asociados a la empresa

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { Plus, Users, Search, AlertCircle, Save } from 'lucide-react';

export const Providers: React.FC = () => {
  const { company } = useAuthStore();
  const { providers, fetchProviders, createProvider, loading } = useInvoiceStore();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  // Estados para nuevo proveedor
  const [name, setName] = useState<string>('');
  const [rif, setRif] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (company?.id) {
      fetchProviders(company.id);
    }
  }, [company?.id, fetchProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!company?.id) return;
    if (!name.trim() || !rif.trim()) {
      setError('Todos los campos son requeridos.');
      return;
    }

    const RIF_REGEX = /^[GJPVDGVEACgpvdgveac]-\d{8}-\d$/i;
    if (!RIF_REGEX.test(rif.trim())) {
      setError('Formato de RIF inválido. Ejemplo aceptado: J-00033800-0 o V-12345678-9');
      return;
    }

    const res = await createProvider(company.id, name, rif);
    if (res.success) {
      setSuccess(true);
      setName('');
      setRif('');
      // Recargar lista
      fetchProviders(company.id);
      setTimeout(() => setShowAddForm(false), 1500);
    } else {
      setError(res.error || 'Ocurrió un error al registrar el proveedor.');
    }
  };

  const filteredProviders = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Proveedores Registrados</h2>
          <p className="text-muted-foreground text-sm">Administre los datos de contacto y facturación fiscal de sus proveedores.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
            setSuccess(false);
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      {showAddForm && (
        <div className="glass-card rounded-3xl p-6 max-w-2xl border border-primary/20">
          <h3 className="text-lg font-bold text-text-main mb-4">Registrar Proveedor</h3>
          
          {error && (
            <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-xs">
              <AlertCircle size={16} />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-4 py-2.5 rounded-xl mb-4 text-xs font-semibold">
              ¡Proveedor registrado con éxito!
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Razón Social</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-premium w-full text-sm"
                placeholder="Distribuidora C.A."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RIF Fiscal</label>
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                className="input-premium w-full text-sm font-mono"
                placeholder="J-12345678-9"
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary py-2 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary py-2 text-xs"
              >
                <Save size={14} />
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA Y LISTADO */}
      <div className="glass-card rounded-3xl p-6">
        <div className="relative flex items-center mb-6">
          <span className="absolute left-4 text-muted-foreground">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-premium w-full pl-11 text-sm"
            placeholder="Buscar por Nombre o RIF..."
          />
        </div>

        {filteredProviders.length === 0 ? (
          <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
            <Users className="mx-auto text-muted-foreground mb-2" size={40} />
            <p className="text-muted-foreground text-sm">No se encontraron proveedores que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="glass-card p-5 rounded-2xl hover:border-primary/40 flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold mb-4">
                    {provider.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h4 className="text-base font-bold text-text-main line-clamp-2">{provider.name}</h4>
                  <p className="text-xs font-mono text-primary/95 dark:text-primary mt-1 uppercase tracking-wider">{provider.rif}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-main text-[10px] text-muted-foreground font-mono">
                  Registrado: {new Date(provider.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
