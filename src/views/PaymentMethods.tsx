import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCompanyPaymentMethodStore } from '../store/companyPaymentMethodStore';
import { Plus, Trash2, Landmark, Phone, Mail, User, CreditCard, ShieldCheck, ArrowLeft, Save, AlertCircle, Coins } from 'lucide-react';
import Swal from 'sweetalert2';

const BANK_OPTIONS = [
  'BANESCO',
  'MERCANTIL',
  'PROVINCIAL',
  'BANCO DE VENEZUELA',
  'BNC',
  'BANPLUS',
  'BFC',
  'ZELLE',
  'OTRO'
];

export const PaymentMethods: React.FC = () => {
  const { company } = useAuthStore();
  const { methods, fetchMethods, addMethod, deleteMethod, loading } = useCompanyPaymentMethodStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle'>('Transferencia');
  const [bankName, setBankName] = useState(BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [documentId, setDocumentId] = useState('');

  useEffect(() => {
    if (company?.id) {
      fetchMethods(company.id);
    }
  }, [company?.id, fetchMethods]);

  const handleResetForm = () => {
    setName('');
    setType('Transferencia');
    setBankName(BANK_OPTIONS[0]);
    setAccountNumber('');
    setPhoneNumber('');
    setEmail('');
    setAccountHolder('');
    setDocumentId('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la forma de pago es obligatorio.');
      return;
    }

    if (type === 'Zelle' && !email.trim()) {
      setError('Debe ingresar el correo electrónico para Zelle.');
      return;
    }

    if (type === 'Pago Móvil' && (!phoneNumber.trim() || !documentId.trim())) {
      setError('El teléfono y el RIF/CI son requeridos para Pago Móvil.');
      return;
    }

    if (type === 'Transferencia' && accountNumber.length !== 20) {
      setError('El número de cuenta bancaria debe contener exactamente 20 dígitos.');
      return;
    }

    const success = await addMethod({
      company_id: company?.id || '',
      name: name.trim(),
      type,
      bank_name: type === 'Efectivo' ? undefined : bankName.toUpperCase(),
      account_number: type === 'Transferencia' ? accountNumber : undefined,
      phone_number: type === 'Pago Móvil' ? phoneNumber : undefined,
      email: type === 'Zelle' ? email : undefined,
      account_holder: accountHolder.trim() || undefined,
      document_id: documentId.trim().toUpperCase() || undefined
    });

    if (success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Forma de pago registrada.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      handleResetForm();
      setShowAddForm(false);
    } else {
      setError('Ocurrió un error al guardar la forma de pago. Verifique que el nombre sea único.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: '¿Eliminar Forma de Pago?',
      text: `¿Está seguro de eliminar "${name}" de sus canales de pago?`,
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
      const success = await deleteMethod(id);
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Forma de pago eliminada.',
          showConfirmButton: false,
          timer: 1500,
          background: isDark ? '#1e1b4b' : '#ffffff',
          color: isDark ? '#f3f4f6' : '#1f2937'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Landmark className="text-primary" />
            Configuración de Formas de Pago
          </h2>
          <p className="text-muted-foreground text-sm">Registre los canales de egreso bancarios y cajas de efectivo de su empresa.</p>
        </div>
        
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) handleResetForm();
          }}
          className="btn-primary flex items-center gap-2"
        >
          {showAddForm ? (
            <>
              <ArrowLeft size={16} />
              Volver a la Lista
            </>
          ) : (
            <>
              <Plus size={16} />
              Crear Canal de Pago
            </>
          )}
        </button>
      </div>

      {showAddForm ? (
        /* FORMULARIO DE ALTA */
        <div className="glass-card rounded-3xl p-6 max-w-2xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-lg font-bold text-text-main mb-4">Nueva Forma de Pago Corporativa</h3>
          
          {error && (
            <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2 text-xs">
              <AlertCircle size={16} />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Nombre del Canal</label>
              <input
                type="text"
                required
                className="input-premium w-full text-sm"
                placeholder="Ej. Banesco Corriente Principal o Zelle Oficina"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tipo de Canal</label>
              <select
                className="input-premium w-full text-sm"
                value={type}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setType(val);
                  if (val === 'Zelle') setBankName('ZELLE');
                  else if (val === 'Efectivo') setBankName('EFECTIVO');
                  else if (bankName === 'ZELLE' || bankName === 'EFECTIVO') setBankName(BANK_OPTIONS[0]);
                }}
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Zelle">Zelle (USD)</option>
                <option value="Efectivo">Caja de Efectivo</option>
              </select>
            </div>

            {type !== 'Efectivo' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Banco</label>
                <select
                  className="input-premium w-full text-sm"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  {BANK_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'Transferencia' && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Número de Cuenta Bancaria (20 dígitos)</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  className="input-premium w-full text-sm font-mono"
                  placeholder="01020000000000000000"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}

            {type === 'Pago Móvil' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Número de Teléfono</label>
                  <input
                    type="tel"
                    required
                    className="input-premium w-full text-sm font-mono"
                    placeholder="04141234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Cédula / RIF</label>
                  <input
                    type="text"
                    required
                    className="input-premium w-full text-sm font-mono"
                    placeholder="J-12345678-9"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                  />
                </div>
              </>
            )}

            {type === 'Zelle' && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Correo Electrónico Zelle</label>
                <input
                  type="email"
                  required
                  className="input-premium w-full text-sm font-mono"
                  placeholder="zelle@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {type !== 'Efectivo' && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Titular de la Cuenta</label>
                <input
                  type="text"
                  className="input-premium w-full text-sm"
                  placeholder="Nombre de la Empresa o Titular"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2 pt-4 border-t border-border-main/40">
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
                className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
              >
                <Save size={14} />
                Guardar Canal
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* LISTADO DE FORMAS DE PAGO */
        <div className="glass-card rounded-3xl p-6">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-semibold animate-pulse">
              Cargando canales de egresos corporativos...
            </div>
          ) : methods.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
              <ShieldCheck className="mx-auto text-muted-foreground mb-2 animate-bounce" size={40} />
              <p className="text-muted-foreground text-sm font-bold">No posee canales de pago configurados.</p>
              <p className="text-slate-400 text-xs mt-1">Haga clic en "Crear Canal de Pago" para registrar su primer canal de tesorería.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="relative overflow-hidden border border-border-main dark:border-indigo-950/40 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-indigo-950/10 dark:to-indigo-950/20 p-5 rounded-2xl flex flex-col justify-between h-44 shadow-sm hover:border-primary/40 transition-all"
                >
                  <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl"></div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                        method.type === 'Zelle'
                          ? 'bg-purple-100 text-purple-800'
                          : method.type === 'Pago Móvil'
                          ? 'bg-amber-100 text-amber-800'
                          : method.type === 'Efectivo'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {method.type}
                      </span>
                      <h4 className="font-extrabold text-sm text-text-main mt-1 tracking-tight truncate max-w-[150px]" title={method.name}>
                        {method.name}
                      </h4>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(method.id, method.name)}
                      className="p-1.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer inline-flex"
                      title="Eliminar Canal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Detalles técnicos */}
                  <div className="space-y-1 font-mono text-[11px] text-text-main/80 pt-2">
                    {method.type === 'Efectivo' ? (
                      <p className="flex items-center gap-1.5 text-rose-600 font-bold">
                        <Coins size={12} />
                        Caja de Efectivo Interno
                      </p>
                    ) : (
                      <>
                        {method.account_number && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <CreditCard size={12} className="text-slate-400" />
                            {method.account_number.replace(/(\d{4})/g, '$1 ')}
                          </p>
                        )}
                        {method.phone_number && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <Phone size={12} className="text-slate-400" />
                            {method.phone_number}
                          </p>
                        )}
                        {method.email && (
                          <p className="flex items-center gap-1.5 font-bold">
                            <Mail size={12} className="text-slate-400" />
                            {method.email}
                          </p>
                        )}
                        {method.account_holder && (
                          <p className="flex items-center gap-1.5 text-slate-400 font-semibold truncate max-w-[210px] mt-1">
                            <User size={11} />
                            {method.account_holder} {method.document_id ? `(${method.document_id})` : ''}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
