import React, { useState, useEffect } from 'react';
import { useProviderBankAccountStore } from '../../store/providerBankAccountStore';
import { X, Plus, Trash2, Landmark, Phone, Mail, User, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';

interface ProviderBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  providerId: string;
  providerName: string;
}

const BANK_OPTIONS = [
  'BANESCO',
  'MERCANTIL',
  'PROVINCIAL',
  'BANCO DE VENEZUELA',
  'BNC',
  'BANPLUS',
  'BFC',
  'BOD',
  'ZELLE',
  'OTRO'
];

export const ProviderBankModal: React.FC<ProviderBankModalProps> = ({
  isOpen,
  onClose,
  companyId,
  providerId,
  providerName
}) => {
  const { accounts, fetchAccounts, addAccount, deleteAccount, loading } = useProviderBankAccountStore();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [bankName, setBankName] = useState(BANK_OPTIONS[0]);
  const [accountType, setAccountType] = useState<'Corriente' | 'Ahorro' | 'Pago Móvil' | 'Zelle' | 'Efectivo'>('Corriente');
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [documentId, setDocumentId] = useState('');

  useEffect(() => {
    if (isOpen && companyId && providerId) {
      fetchAccounts(companyId, providerId);
      setShowAddForm(false);
    }
  }, [isOpen, companyId, providerId, fetchAccounts]);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setBankName(BANK_OPTIONS[0]);
    setAccountType('Corriente');
    setAccountNumber('');
    setPhoneNumber('');
    setEmail('');
    setAccountHolder('');
    setDocumentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas según el tipo de cuenta
    if (accountType === 'Zelle' && !email.trim()) {
      Swal.fire('Error', 'Debe ingresar el correo para Zelle.', 'warning');
      return;
    }
    if (accountType === 'Pago Móvil' && (!phoneNumber.trim() || !documentId.trim())) {
      Swal.fire('Error', 'Debe ingresar el teléfono y cédula/RIF para Pago Móvil.', 'warning');
      return;
    }
    if ((accountType === 'Corriente' || accountType === 'Ahorro') && accountNumber.length !== 20) {
      Swal.fire('Error', 'El número de cuenta bancaria debe contener exactamente 20 dígitos.', 'warning');
      return;
    }

    const success = await addAccount({
      company_id: companyId,
      provider_id: providerId,
      bank_name: bankName.toUpperCase(),
      account_type: accountType as any,
      account_number: (accountType === 'Corriente' || accountType === 'Ahorro') ? accountNumber : undefined,
      phone_number: accountType === 'Pago Móvil' ? phoneNumber : undefined,
      email: accountType === 'Zelle' ? email : undefined,
      account_holder: accountHolder.trim() || undefined,
      document_id: documentId.trim().toUpperCase() || undefined
    });

    if (success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Cuenta registrada exitosamente.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      handleResetForm();
      setShowAddForm(false);
    } else {
      Swal.fire('Error', 'No se pudo registrar la cuenta bancaria.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: '¿Eliminar Cuenta?',
      text: '¿Está seguro de eliminar esta cuenta bancaria? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563',
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    });

    if (result.isConfirmed) {
      const success = await deleteAccount(id);
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Cuenta eliminada.',
          showConfirmButton: false,
          timer: 1500,
          background: isDark ? '#1e1b4b' : '#ffffff',
          color: isDark ? '#f3f4f6' : '#1f2937'
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 border border-border-main dark:border-indigo-950 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* CABECERA */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border-main">
          <div>
            <h3 className="text-base font-bold text-text-main">
              Información Bancaria
            </h3>
            <p className="text-[11px] text-primary font-bold uppercase mt-0.5">
              Proveedor: {providerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/30 text-muted-foreground hover:text-text-main rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* BOTÓN DE NUEVA CUENTA / REGRESO */}
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-text-main uppercase tracking-wider">
              {showAddForm ? 'Nueva Cuenta Bancaria' : 'Cuentas Registradas'}
            </h4>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (showAddForm) handleResetForm();
              }}
              className={`btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 ${
                showAddForm ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' : ''
              }`}
            >
              {showAddForm ? (
                <span>Volver a la lista</span>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Agregar Cuenta</span>
                </>
              )}
            </button>
          </div>

          {showAddForm ? (
            /* FORMULARIO DE REGISTRO */
            <form onSubmit={handleSubmit} className="space-y-4 bg-muted/5 border border-border-main/50 p-5 rounded-2xl animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Banco</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="input-premium w-full text-sm py-2"
                  >
                    {BANK_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tipo de Cuenta</label>
                  <select
                    value={accountType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setAccountType(val);
                      if (val === 'Zelle') setBankName('ZELLE');
                      else if (bankName === 'ZELLE') setBankName(BANK_OPTIONS[0]);
                    }}
                    className="input-premium w-full text-sm py-2"
                  >
                    <option value="Corriente">Cuenta Corriente</option>
                    <option value="Ahorro">Cuenta de Ahorros</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle (USD)</option>
                  </select>
                </div>

                {/* Campos Dinámicos según tipo */}
                {(accountType === 'Corriente' || accountType === 'Ahorro') && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Número de Cuenta (20 dígitos)</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      className="input-premium w-full text-sm font-mono"
                      placeholder="01020000000000000000"
                      required
                    />
                  </div>
                )}

                {accountType === 'Pago Móvil' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Número de Teléfono</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="input-premium w-full text-sm font-mono"
                        placeholder="04141234567"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Cédula / RIF del Titular</label>
                      <input
                        type="text"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        className="input-premium w-full text-sm font-mono"
                        placeholder="V-12345678"
                        required
                      />
                    </div>
                  </>
                )}

                {accountType === 'Zelle' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Correo Electrónico Registrado</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-premium w-full text-sm font-mono"
                      placeholder="pagos@proveedor.com"
                      required
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="input-premium w-full text-sm"
                    placeholder="Razón Social o Nombre del Titular"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-main/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    handleResetForm();
                  }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-4"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          ) : (
            /* LISTADO DE CUENTAS EXISTENTES */
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-medium animate-pulse">
                  Cargando cuentas bancarias...
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
                  <Landmark className="mx-auto text-muted-foreground mb-2" size={32} />
                  <p className="text-muted-foreground text-sm font-semibold">No posee cuentas bancarias registradas.</p>
                  <p className="text-slate-400 text-xs mt-1">Presione "Agregar Cuenta" para cargar la primera.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="relative overflow-hidden border border-border-main dark:border-indigo-950/40 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-indigo-950/10 dark:to-indigo-950/20 p-5 rounded-2xl flex flex-col justify-between h-40 shadow-sm transition-all hover:border-primary/30"
                    >
                      {/* Gradient effect */}
                      <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-xl"></div>

                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                            acc.account_type === 'Zelle'
                              ? 'bg-purple-100 text-purple-800'
                              : acc.account_type === 'Pago Móvil'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {acc.account_type}
                          </span>
                          <h5 className="font-extrabold text-sm text-text-main mt-1 tracking-tight">{acc.bank_name}</h5>
                        </div>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer inline-flex"
                          title="Eliminar Cuenta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Detalles del canal bancario */}
                      <div className="space-y-1 font-mono text-[11px] text-text-main/80">
                        {acc.account_number && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <CreditCard size={12} className="text-slate-400" />
                            {acc.account_number.replace(/(\d{4})/g, '$1 ')}
                          </p>
                        )}
                        {acc.phone_number && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <Phone size={12} className="text-slate-400" />
                            {acc.phone_number}
                          </p>
                        )}
                        {acc.email && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <Mail size={12} className="text-slate-400" />
                            {acc.email}
                          </p>
                        )}
                        {acc.account_holder && (
                          <p className="flex items-center gap-1.5 mt-1 text-slate-400 font-semibold truncate max-w-[220px]">
                            <User size={11} />
                            {acc.account_holder} {acc.document_id ? `(${acc.document_id})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
