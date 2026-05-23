// dShopping Lite - Vista de Proveedores
// Gestión integral de proveedores asociados a la empresa

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { ExportModal } from '../components/ExportModal';
import { Plus, Users, Search, AlertCircle, Save, Edit, Trash2, ArrowLeft, Download, Landmark, Mail, Phone, CreditCard, Copy } from 'lucide-react';
import Swal from 'sweetalert2';
import { ProviderBankModal } from '../components/providers/ProviderBankModal';


export const Providers: React.FC = () => {
  const { company } = useAuthStore();
  const { providers, fetchProviders, createProvider, updateProvider, deleteProvider, loading } = useInvoiceStore();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [providerToEdit, setProviderToEdit] = useState<any | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [bankModalProvider, setBankModalProvider] = useState<any | null>(null);

  
  const [name, setName] = useState<string>('');
  const [rif, setRif] = useState<string>('');
  const [isTaxpayer, setIsTaxpayer] = useState<boolean>(false);
  const [ivaRetentionPercentage, setIvaRetentionPercentage] = useState<75 | 100>(75);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (company?.id) {
      fetchProviders(company.id);
    }
  }, [company?.id, fetchProviders]);

  useEffect(() => {
    if (providerToEdit) {
      setName(providerToEdit.name);
      setRif(providerToEdit.rif);
      setIsTaxpayer(providerToEdit.is_taxpayer || false);
      setIvaRetentionPercentage(providerToEdit.iva_retention_percentage || 75);
      setError(null);
      setSuccess(false);
    } else {
      setName('');
      setRif('');
      setIsTaxpayer(false);
      setIvaRetentionPercentage(75);
    }
  }, [providerToEdit]);

  useEffect(() => {
    if (providerToEdit) {
      const current = providers.find((p) => p.id === providerToEdit.id);
      if (current && JSON.stringify(current.bank_accounts) !== JSON.stringify(providerToEdit.bank_accounts)) {
        setProviderToEdit(current);
      }
    }
  }, [providers, providerToEdit]);

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

    let res;
    if (providerToEdit) {
      res = await updateProvider(providerToEdit.id, name, rif, isTaxpayer, ivaRetentionPercentage);
    } else {
      res = await createProvider(company.id, name, rif, isTaxpayer, ivaRetentionPercentage);
    }

    if (res.success) {
      setSuccess(true);
      setName('');
      setRif('');
      // Recargar lista
      fetchProviders(company.id);
      if (providerToEdit) {
        Swal.fire({
          title: '¡Actualizado!',
          text: 'El proveedor ha sido actualizado exitosamente.',
          icon: 'success',
          confirmButtonColor: '#8b5cf6',
          background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937',
          timer: 2000,
          showConfirmButton: false
        });
        setProviderToEdit(null);
      } else {
        setTimeout(() => setShowAddForm(false), 1500);
      }
    } else {
      setError(res.error || 'Ocurrió un error al guardar el proveedor.');
    }
  };

  const handleDeleteProvider = async (providerId: string, providerName: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    Swal.fire({
      title: '¿Eliminar Proveedor?',
      text: `¿Está seguro de que desea ELIMINAR al proveedor "${providerName}"? Esta operación podría afectar facturas asociadas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', // Rojo
      cancelButtonColor: '#4b5563', // Gris
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteProvider(providerId);
        if (res.success) {
          Swal.fire({
            title: '¡Eliminado!',
            text: 'El proveedor ha sido eliminado del sistema.',
            icon: 'success',
            confirmButtonColor: '#8b5cf6',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            timer: 2000,
            showConfirmButton: false
          });
          if (company?.id) fetchProviders(company.id);
        } else {
          Swal.fire({
            title: 'Error',
            text: res.error || 'Ocurrió un error al eliminar al proveedor.',
            icon: 'error',
            confirmButtonColor: '#ef4444',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
          });
        }
      }
    });
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
        <div className="flex gap-3">
          <button
            onClick={() => setIsExportOpen(true)}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <Download size={16} />
            Exportar Datos
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setProviderToEdit(null);
              setError(null);
              setSuccess(false);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
      {(showAddForm || providerToEdit !== null) && (
        <div className="glass-card rounded-3xl p-6 max-w-2xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            {providerToEdit && (
              <button
                type="button"
                onClick={() => setProviderToEdit(null)}
                className="p-1.5 hover:bg-muted/35 rounded-xl text-muted-foreground hover:text-text-main transition-colors mr-1 cursor-pointer inline-flex items-center justify-center border border-border-main"
                title="Volver"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <span>{providerToEdit ? 'Editar Proveedor' : 'Registrar Proveedor'}</span>
          </h3>
          
          {error && (
            <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-xs">
              <AlertCircle size={16} />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-4 py-2.5 rounded-xl mb-4 text-xs font-semibold">
              {providerToEdit ? '¡Proveedor actualizado con éxito!' : '¡Proveedor registrado con éxito!'}
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
            
            {/* Nuevos Campos SENIAT */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 bg-muted/20 border border-border-main rounded-xl">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTaxpayer"
                  checked={isTaxpayer}
                  onChange={(e) => setIsTaxpayer(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="isTaxpayer" className="text-sm font-semibold text-text-main cursor-pointer">
                  Es Contribuyente Especial SENIAT
                </label>
              </div>
              
              {isTaxpayer && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">% Retención IVA</label>
                  <select
                    value={ivaRetentionPercentage}
                    onChange={(e) => setIvaRetentionPercentage(Number(e.target.value) as 75 | 100)}
                    className="input-premium w-full text-sm"
                  >
                    <option value={75}>75%</option>
                    <option value={100}>100%</option>
                  </select>
                </div>
              )}
            </div>

            {/* Visualización y Gestión Directa de Cuentas Bancarias en Edición */}
            {providerToEdit && (
              <div className="sm:col-span-2 border-t border-border-main/50 pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
                    <Landmark size={16} className="text-primary" />
                    <span>Cuentas Bancarias Vinculadas</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setBankModalProvider(providerToEdit)}
                    className="btn-secondary py-1 px-3 text-[11px] flex items-center gap-1.5 border border-border-main/60 bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-lg"
                  >
                    <Plus size={12} />
                    Gestionar Cuentas
                  </button>
                </div>

                {(!providerToEdit.bank_accounts || providerToEdit.bank_accounts.length === 0) ? (
                  <div className="text-xs text-muted-foreground italic bg-muted/10 p-3.5 rounded-xl border border-dashed border-border-main/30 text-center">
                    Este proveedor no posee cuentas bancarias vinculadas. Presione "Gestionar Cuentas" para agregar la primera.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {providerToEdit.bank_accounts.map((acc: any) => {
                      const isZelle = acc.account_type === 'Zelle';
                      const isPagoMovil = acc.account_type === 'Pago Móvil';
                      
                      let displayValue = '';
                      if (acc.account_number) {
                        const num = acc.account_number.replace(/\s/g, '');
                        if (num.length >= 8) {
                          displayValue = `${num.substring(0, 4)}...${num.substring(num.length - 4)}`;
                        } else {
                          displayValue = num;
                        }
                      } else if (acc.phone_number) {
                        displayValue = acc.phone_number;
                      } else if (acc.email) {
                        displayValue = acc.email;
                      }

                      return (
                        <div 
                          key={acc.id} 
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/15 border border-border-main/40"
                        >
                          {isZelle ? (
                            <Mail size={14} className="text-purple-500 shrink-0" />
                          ) : isPagoMovil ? (
                            <Phone size={14} className="text-amber-500 shrink-0" />
                          ) : (
                            <CreditCard size={14} className="text-emerald-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-text-main leading-tight truncate">{acc.bank_name}</span>
                              <span className="text-[8px] px-1 bg-muted/40 text-muted-foreground rounded uppercase tracking-widest leading-none py-0.5">{acc.account_type}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono leading-none block truncate mt-1">
                              {displayValue}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setProviderToEdit(null);
                }}
                className="btn-secondary py-2 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary py-2 text-xs"
              >
                <Save size={14} />
                {providerToEdit ? 'Guardar Cambios' : 'Guardar Proveedor'}
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
            {filteredProviders.map((provider) => {
              const bankAccounts = provider.bank_accounts || [];
              return (
                <div
                  key={provider.id}
                  className="glass-card p-5 rounded-2xl hover:border-primary/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold mb-4">
                        {provider.name.substring(0, 2).toUpperCase()}
                      </div>
                      {/* Botones de acción rápidos */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => setBankModalProvider(provider)}
                          className="p-1.5 text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer inline-flex"
                          title="Cuentas Bancarias"
                        >
                          <Landmark size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setProviderToEdit(provider);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer inline-flex"
                          title="Editar Proveedor"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id, provider.name)}
                          className="p-1.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer inline-flex"
                          title="Eliminar Proveedor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-text-main line-clamp-2">{provider.name}</h4>
                    <p className="text-xs font-mono text-primary/95 dark:text-primary mt-1 uppercase tracking-wider">{provider.rif}</p>
                    {provider.is_taxpayer && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-md">
                        CONTRIBUYENTE ESPECIAL ({provider.iva_retention_percentage}%)
                      </span>
                    )}

                    {/* Sección de Cuentas de Pago */}
                    <div className="mt-4 pt-3 border-t border-border-main/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Cuentas de Pago</span>
                        <span className="text-[9px] font-bold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                          {bankAccounts.length} {bankAccounts.length === 1 ? 'cuenta' : 'cuentas'}
                        </span>
                      </div>

                      {bankAccounts.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground italic bg-muted/10 p-2.5 rounded-xl text-center border border-dashed border-border-main/30">
                          Sin datos bancarios registrados.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                          {bankAccounts.map((acc: any) => {
                            const isZelle = acc.account_type === 'Zelle';
                            const isPagoMovil = acc.account_type === 'Pago Móvil';
                            
                            let displayValue = '';
                            if (acc.account_number) {
                              const num = acc.account_number.replace(/\s/g, '');
                              if (num.length >= 8) {
                                displayValue = `${num.substring(0, 4)}...${num.substring(num.length - 4)}`;
                              } else {
                                displayValue = num;
                              }
                            } else if (acc.phone_number) {
                              displayValue = acc.phone_number;
                            } else if (acc.email) {
                              displayValue = acc.email;
                            }

                            return (
                              <div 
                                key={acc.id} 
                                className="group flex items-center justify-between p-1.5 rounded-lg bg-muted/15 border border-border-main/40 hover:bg-muted/30 transition-all"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isZelle ? (
                                    <Mail size={12} className="text-purple-500 shrink-0" />
                                  ) : isPagoMovil ? (
                                    <Phone size={12} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <CreditCard size={12} className="text-emerald-500 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-black text-text-main leading-tight truncate">{acc.bank_name}</span>
                                      <span className="text-[8px] px-1 bg-muted/40 text-muted-foreground rounded shrink-0 uppercase tracking-widest leading-none py-0.5">{acc.account_type}</span>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-mono leading-none block truncate max-w-[140px]" title={acc.account_number || acc.phone_number || acc.email}>
                                      {displayValue}
                                    </span>
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const textToCopy = acc.account_number || acc.phone_number || acc.email || '';
                                    navigator.clipboard.writeText(textToCopy);
                                    Swal.fire({
                                      toast: true,
                                      position: 'top-end',
                                      icon: 'success',
                                      title: '¡Copiado al portapapeles!',
                                      showConfirmButton: false,
                                      timer: 1500,
                                      background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
                                      color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
                                    });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded text-primary transition-all cursor-pointer shrink-0"
                                  title="Copiar cuenta"
                                >
                                  <Copy size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-main text-[10px] text-muted-foreground font-mono">
                    Registrado: {new Date(provider.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        dataType="providers"
        data={filteredProviders}
        providersList={providers}
      />

      <ProviderBankModal
        isOpen={bankModalProvider !== null}
        onClose={() => {
          setBankModalProvider(null);
          if (company?.id) {
            fetchProviders(company.id);
          }
        }}
        companyId={company?.id || ''}
        providerId={bankModalProvider?.id || ''}
        providerName={bankModalProvider?.name || ''}
      />
    </div>
  );
};
