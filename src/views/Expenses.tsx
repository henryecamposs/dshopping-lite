// dShopping Lite - Módulo de Gastos Operativos (Expenses View)
// Interfaz visual premium con glassmorphism, KPIs y modal flotante de alta
// Desarrollado por @Dev_React bajo la metodología SDD

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExpenseStore } from '../store/expenseStore';
import { useCompanyPaymentMethodStore } from '../store/companyPaymentMethodStore';
import { useExchangeStore } from '../store/exchangeStore';
import { 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Coins, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  CreditCard, 
  AlertCircle, 
  Search,
  Filter,
  X,
  CheckCircle,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import Swal from 'sweetalert2';

const CATEGORIES = [
  'Servicios Públicos',
  'Alquileres',
  'Nómina/Sueldos',
  'Mantenimiento',
  'Impuestos',
  'Suministros',
  'Otros'
];

export const Expenses: React.FC = () => {
  const { company } = useAuthStore();
  const { expenses, fetchExpenses, addExpense, deleteExpense, loading } = useExpenseStore();
  const { methods, fetchMethods } = useCompanyPaymentMethodStore();
  const { currentRate, fetchCurrentRate } = useExchangeStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (company?.id) {
      fetchExpenses(company.id);
      fetchMethods(company.id);
      fetchCurrentRate(company.id);
    }
  }, [company?.id, fetchExpenses, fetchMethods, fetchCurrentRate]);

  const handleResetForm = () => {
    setDescription('');
    setCategory(CATEGORIES[0]);
    setAmount('');
    setCurrency('USD');
    setPaymentMethodId('');
    setReferenceNumber('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!company?.id) return;

    if (!currentRate?.id) {
      setError('No se puede registrar un gasto sin una tasa cambiaria del día establecida. Por favor, configure la tasa en la cabecera antes de continuar.');
      return;
    }

    if (!description.trim()) {
      setError('La descripción del gasto es obligatoria.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Debe ingresar un monto válido y mayor a cero.');
      return;
    }

    const success = await addExpense(company.id, {
      description: description.trim(),
      category,
      amount: numAmount,
      currency,
      exchange_rate_id: currentRate.id,
      payment_method_id: paymentMethodId || undefined,
      reference_number: referenceNumber.trim() || undefined,
      expense_date: expenseDate
    });

    if (success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Gasto operativo registrado con éxito.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      handleResetForm();
      setShowAddForm(false);
    } else {
      setError('Ocurrió un error al intentar registrar el gasto en el servidor.');
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: '¿Eliminar Gasto?',
      text: `¿Está seguro de eliminar el gasto por "${desc}"?`,
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
      const success = await deleteExpense(id);
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Registro de gasto eliminado.',
          showConfirmButton: false,
          timer: 1500,
          background: isDark ? '#1e1b4b' : '#ffffff',
          color: isDark ? '#f3f4f6' : '#1f2937'
        });
      }
    }
  };

  // Filtrado de Gastos
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (exp.reference_number && exp.reference_number.includes(searchTerm));
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesCurrency = currencyFilter === 'All' || exp.currency === currencyFilter;
    const matchesDate = !dateFilter || exp.expense_date === dateFilter;

    return matchesSearch && matchesCategory && matchesCurrency && matchesDate;
  });

  // KPIs
  const rate = currentRate?.rate_value || 45.0;
  
  const stats = React.useMemo(() => {
    let totalUSD = 0;
    let totalVES = 0;
    const categoryCounts: { [key: string]: number } = {};

    expenses.forEach(e => {
      // Registrar conteo de categorías
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + (e.currency === 'USD' ? e.amount : e.amount / (e.exchange_rate_value || rate));

      if (e.currency === 'USD') {
        totalUSD += e.amount;
        totalVES += e.amount * (e.exchange_rate_value || rate);
      } else {
        totalVES += e.amount;
        totalUSD += e.amount / (e.exchange_rate_value || rate);
      }
    });

    // Encontrar categoría con mayor gasto
    let topCategory = 'Ninguna';
    let maxVal = 0;
    Object.entries(categoryCounts).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        topCategory = cat;
      }
    });

    return {
      totalUSD,
      totalVES,
      count: expenses.length,
      topCategory
    };
  }, [expenses, rate]);

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Coins className="text-primary animate-pulse" />
            Gastos Operativos
          </h2>
          <p className="text-muted-foreground text-sm">Administre y controle los egresos operativos y cajas menores de su empresa en tiempo real.</p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(true);
            setError(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Registrar Gasto
        </button>
      </div>

      {/* KPIS FINANCIEROS (Estética Premium Glassmorphism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border-main/55 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-indigo-950/5 dark:to-indigo-950/15 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Egresos Totales (USD)</span>
            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-emerald-555 dark:text-emerald-400">
              ${stats.totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Conversión histórica consolidada</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border-main/55 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-indigo-950/5 dark:to-indigo-950/15 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Egresos Totales (VES)</span>
            <div className="bg-amber-500/10 p-2 rounded-lg text-amber-555">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-amber-650 dark:text-amber-400">
              Bs. {stats.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Conversión cambiaria acumulada</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border-main/55 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-indigo-950/5 dark:to-indigo-950/15 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gastos Registrados</span>
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-text-main">
              {stats.count}
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Transacciones operativas</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border-main/55 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-indigo-950/5 dark:to-indigo-950/15 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mayor Categoría</span>
            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500">
              <Tag size={16} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-black text-text-main truncate" title={stats.topCategory}>
              {stats.topCategory}
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">Mayor concentración de egreso</span>
          </div>
        </div>
      </div>

      {/* FILTROS Y CONTROLES */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Buscar gasto por descripción, categoría, referencia..."
              className="input-premium w-full pl-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="input-premium text-xs py-2"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">Todas las Categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="input-premium text-xs py-2"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
            >
              <option value="All">Moneda: Todas</option>
              <option value="USD">USD ($)</option>
              <option value="VES">VES (Bs.)</option>
            </select>

            <input
              type="date"
              className="input-premium text-xs py-2"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            {(searchTerm || categoryFilter !== 'All' || currencyFilter !== 'All' || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('All');
                  setCurrencyFilter('All');
                  setDateFilter('');
                }}
                className="btn-secondary text-xs p-2.5 flex items-center gap-1 border-rose-500/10 text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/25"
                title="Limpiar Filtros"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FORMULARIO MODAL (REGISTRAR GASTO) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl w-full max-w-2xl border border-primary/20 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Coins className="text-primary" size={20} />
                Registrar Nuevo Gasto Operativo
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  handleResetForm();
                }}
                className="p-1.5 text-muted-foreground hover:text-text-main rounded-lg hover:bg-muted/30 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {currentRate ? (
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-2">
                    <CheckCircle size={14} />
                    Tasa del Día Detectada
                  </span>
                  <span className="font-bold font-mono">1 USD = {currentRate.rate_value.toFixed(2)} Bs.</span>
                </div>
              ) : (
                <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={16} />
                  <span>ALERTA: No se ha configurado la Tasa del Día. Configure la tasa en la parte superior antes de registrar un gasto.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Descripción del Gasto</label>
                  <input
                    type="text"
                    required
                    className="input-premium w-full text-sm"
                    placeholder="Ej. Pago de Alquiler de Local - Mes de Mayo"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Categoría</label>
                  <select
                    className="input-premium w-full text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Fecha de Registro</label>
                  <input
                    type="date"
                    required
                    className="input-premium w-full text-sm font-mono"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Moneda de Registro</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`py-2 px-4 rounded-xl border text-sm font-bold transition-all ${
                        currency === 'USD' 
                          ? 'bg-primary/10 text-primary border-primary' 
                          : 'border-border-main hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      Dólares (USD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('VES')}
                      className={`py-2 px-4 rounded-xl border text-sm font-bold transition-all ${
                        currency === 'VES' 
                          ? 'bg-amber-500/10 text-amber-550 border-amber-500' 
                          : 'border-border-main hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      Bolívares (VES)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Monto total</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-muted-foreground font-bold font-mono">
                      {currency === 'USD' ? '$' : 'Bs.'}
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="input-premium w-full pl-10 text-sm font-bold font-mono"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {amount && currentRate && (
                  <div className="sm:col-span-2 bg-muted/10 border border-border-main p-3 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground uppercase">Equivalente Estimado:</span>
                    <span className="font-black font-mono">
                      {currency === 'USD' ? (
                        <span className="text-amber-655 font-bold">
                          Bs. {(parseFloat(amount) * currentRate.rate_value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-555 font-bold">
                          $ {(parseFloat(amount) / currentRate.rate_value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Cuenta / Caja de Egreso</label>
                  <select
                    className="input-premium w-full text-sm"
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                  >
                    <option value="">Efectivo / Caja Menor / Otro</option>
                    {methods.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Número de Referencia</label>
                  <input
                    type="text"
                    disabled={!paymentMethodId}
                    className="input-premium w-full text-sm font-mono disabled:opacity-50 disabled:bg-muted/10"
                    placeholder="Nro de Confirmación"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border-main/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    handleResetForm();
                  }}
                  className="btn-secondary py-2 px-5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!currentRate}
                  className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLA DE DETALLES DE GASTOS */}
      <div className="glass-card rounded-3xl p-6 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm font-semibold animate-pulse">
            Consultando libro diario de gastos...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
            <Coins className="mx-auto text-muted-foreground mb-2 animate-bounce" size={40} />
            <p className="text-muted-foreground text-sm font-bold">No se encontraron gastos operacionales en este periodo.</p>
            <p className="text-slate-400 text-xs mt-1">Haga clic en "Registrar Gasto" para registrar egresos corporativos en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-main text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider bg-muted/10">
                  <th className="py-3.5 px-4 rounded-l-xl">Fecha</th>
                  <th className="py-3.5 px-4">Descripción</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Canal / Egreso</th>
                  <th className="py-3.5 px-4">Referencia</th>
                  <th className="py-3.5 px-4 text-right">Monto Original</th>
                  <th className="py-3.5 px-4 text-center">Tasa Cambio</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Total Bs / USD</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/40 text-sm">
                {filteredExpenses.map((exp) => {
                  const rateVal = exp.exchange_rate_value || rate;
                  const totalBs = exp.currency === 'USD' ? exp.amount * rateVal : exp.amount;
                  const totalUSD = exp.currency === 'VES' ? exp.amount / rateVal : exp.amount;

                  return (
                    <tr 
                      key={exp.id}
                      className="hover:bg-muted/15 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-xs whitespace-nowrap">
                        {exp.expense_date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-text-main tracking-tight truncate max-w-[200px]" title={exp.description}>
                          {exp.description}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                          exp.category === 'Alquileres'
                            ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300'
                            : exp.category === 'Nómina/Sueldos'
                            ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300'
                            : exp.category === 'Servicios Públicos'
                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                            : exp.category === 'Impuestos'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                            : exp.category === 'Mantenimiento'
                            ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
                            : 'bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-slate-300'
                        }`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-xs">
                        {exp.payment_method_name || 'Efectivo'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {exp.reference_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-extrabold ${exp.currency === 'USD' ? 'text-emerald-555 dark:text-emerald-400' : 'text-amber-650 dark:text-amber-400'}`}>
                          {exp.currency === 'USD' ? '$' : 'Bs.'} {exp.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs font-bold text-slate-400">
                        {rateVal.toFixed(2)} Bs.
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-extrabold text-text-main text-xs">
                            Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            $ {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(exp.id, exp.description)}
                          className="p-1.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 inline-flex cursor-pointer"
                          title="Eliminar Registro de Gasto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
