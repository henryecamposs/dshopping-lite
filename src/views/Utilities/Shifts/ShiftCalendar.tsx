// dShopping Lite - Planificación de Turnos & Guardias Semanales
// Vista interactiva con persistencia real en Supabase y maquetación de impresión ejecutiva
// Desarrollado por @Dev_React bajo la metodología SDD

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useShiftStore } from '../../../store/useShiftStore';
import { StaffShift } from '../../../types';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  UserPlus, 
  Trash2, 
  Clock, 
  AlertCircle,
  X,
  FileCheck,
  User,
  Sparkles,
  Bookmark
} from 'lucide-react';
import Swal from 'sweetalert2';

const SHIFT_TYPES = [
  'Mañana',
  'Tarde',
  'Integral',
  'Libre',
  'Guardia Nocturna'
] as const;

const SHIFT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Mañana': {
    bg: 'bg-blue-500/10 dark:bg-blue-500/5',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400'
  },
  'Tarde': {
    bg: 'bg-orange-500/10 dark:bg-orange-500/5',
    border: 'border-orange-500/20 dark:border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400'
  },
  'Integral': {
    bg: 'bg-purple-500/10 dark:bg-purple-500/5',
    border: 'border-purple-500/20 dark:border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400'
  },
  'Guardia Nocturna': {
    bg: 'bg-slate-900/15 dark:bg-slate-900/40',
    border: 'border-slate-800/30 dark:border-slate-800/40',
    text: 'text-slate-700 dark:text-slate-350'
  },
  'Libre': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/5',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400'
  }
};

export const ShiftCalendar: React.FC = () => {
  const { company } = useAuthStore();
  const { shifts, fetchShiftsForDateRange, addShift, deleteShift, loading } = useShiftStore();

  const [viewDate, setViewDate] = useState<Date>(() => {
    const today = new Date();
    // Forzar fecha para que caiga en día de semana real
    return today;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [employeeName, setEmployeeName] = useState('');
  const [shiftType, setShiftType] = useState<typeof SHIFT_TYPES[number]>('Mañana');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Generar fechas de la semana actual (Lunes a Domingo)
  const { startOfWeek, endOfWeek, weekDays } = useMemo(() => {
    const current = new Date(viewDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para Lunes como primer día
    
    const monday = new Date(current);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return {
      startOfWeek: monday,
      endOfWeek: sunday,
      weekDays: days
    };
  }, [viewDate]);

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  // Fetch semanal reactivo
  useEffect(() => {
    if (company?.id) {
      fetchShiftsForDateRange(company.id, startStr, endStr);
    }
  }, [company?.id, startStr, endStr, fetchShiftsForDateRange]);

  const handleNextWeek = () => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + 7);
    setViewDate(next);
  };

  const handlePrevWeek = () => {
    const prev = new Date(viewDate);
    prev.setDate(prev.getDate() - 7);
    setViewDate(prev);
  };

  const handleResetForm = () => {
    setEmployeeName('');
    setShiftType('Mañana');
    setShiftDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!company?.id) return;

    if (!employeeName.trim()) {
      setError('El nombre del empleado es obligatorio.');
      return;
    }

    const success = await addShift(company.id, {
      employee_name: employeeName.trim(),
      shift_type: shiftType,
      date: shiftDate,
      notes: notes.trim() || undefined
    });

    if (success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Turno asignado correctamente.',
        showConfirmButton: false,
        timer: 2000,
        background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
      });
      
      // Volver a consultar para asegurar sincronía
      fetchShiftsForDateRange(company.id, startStr, endStr);
      handleResetForm();
      setShowAddModal(false);
    } else {
      setError('Ocurrió un error al registrar el turno.');
    }
  };

  const handleDelete = async (id: string, name: string, date: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const dateFormatted = date.split('-').reverse().join('/');
    
    const result = await Swal.fire({
      title: '¿Eliminar Turno?',
      text: `¿Está seguro de revocar el turno de ${name} asignado el ${dateFormatted}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, revocar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563',
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    });

    if (result.isConfirmed) {
      const success = await deleteShift(id);
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Turno revocado correctamente.',
          showConfirmButton: false,
          timer: 1500,
          background: isDark ? '#1e1b4b' : '#ffffff',
          color: isDark ? '#f3f4f6' : '#1f2937'
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Formateo de fechas para el membrete impreso
  const mondayFormatted = startOfWeek.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sundayFormatted = endOfWeek.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6 print-container">
      
      {/* MEMBRETE EJECUTIVO PARA IMPRESIÓN (Oculto en pantalla) */}
      <div className="print-header">
        <h1>dShopping Lite — Planificación Semanal de Turnos</h1>
        <p><strong>Empresa:</strong> {company?.name} | RIF: {company?.rif}</p>
        <p className="text-sm font-bold uppercase tracking-wider text-black">
          Semana de Guardias: Del {mondayFormatted} al {sundayFormatted}
        </p>
        <p><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString()}</p>
      </div>

      {/* CABECERA (Pantalla) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <CalendarDays className="text-primary animate-pulse" />
            Planificación de Turnos
          </h2>
          <p className="text-muted-foreground text-sm">Organice, administre e imprima el cronograma de guardias y libranzas semanales del equipo.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} className="text-primary" />
            Imprimir Hoja de Guardias
          </button>
          
          <button
            onClick={() => {
              setShowAddModal(true);
              setError(null);
            }}
            className="btn-primary text-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={16} />
            Asignar Turno
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN SEMANAL (Pantalla) */}
      <div className="glass-card p-4 rounded-2xl no-print border border-border-main/60 flex items-center justify-between shadow-sm bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-indigo-950/5 dark:to-indigo-950/15">
        <button
          onClick={handlePrevWeek}
          className="p-2 border border-border-main hover:bg-muted/30 rounded-xl transition-all cursor-pointer text-muted-foreground hover:text-text-main"
          title="Semana Anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Calendario de Turnos</span>
          <span className="text-sm font-black font-mono mt-0.5 text-text-main">
            Semana del {mondayFormatted} al {sundayFormatted}
          </span>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 border border-border-main hover:bg-muted/30 rounded-xl transition-all cursor-pointer text-muted-foreground hover:text-text-main"
          title="Semana Siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* VISTA CALENDARIO GRID DE 7 DÍAS */}
      <div className="glass-card rounded-3xl p-6 overflow-hidden print:border-none print:shadow-none print:p-0">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm font-semibold animate-pulse">
            Consultando libro de guardias semanales...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 print:grid-cols-7 print:gap-2">
            {weekDays.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayShifts = shifts.filter(s => s.date === dateStr);
              
              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = todayStr === dateStr;

              return (
                <div 
                  key={idx} 
                  className={`min-h-[220px] rounded-2xl border p-3 flex flex-col justify-between transition-all duration-350 print:border-2 print:border-black print:rounded-none print:min-h-[240px] print:p-2 ${
                    isToday 
                      ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10' 
                      : 'bg-muted/10 border-border-main/50'
                  }`}
                >
                  {/* Cabecera del día */}
                  <div className="text-center border-b border-border-main/40 pb-2 mb-3 print:border-black">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground print:text-black'}`}>
                      {date.toLocaleDateString('es-VE', { weekday: 'short' })}
                    </p>
                    <p className={`text-base font-black font-mono mt-0.5 ${isToday ? 'text-primary' : 'text-text-main print:text-black'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  
                  {/* Lista de turnos del día */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayShifts.map(shift => {
                      const color = SHIFT_COLORS[shift.shift_type] || { bg: 'bg-muted', border: 'border-border-main', text: 'text-text-main' };
                      return (
                        <div 
                          key={shift.id} 
                          className={`group relative text-xs p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition-all ${color.bg} ${color.border} ${color.text} print:bg-white print:border-black print:rounded-none print:text-black print:p-1.5`}
                        >
                          {/* Botón de Revocar (Oculto en Impresión) */}
                          <button
                            onClick={() => handleDelete(shift.id, shift.employee_name, shift.date)}
                            className="absolute top-1 right-1 p-0.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 print:hidden flex cursor-pointer"
                            title="Revocar Guardia"
                          >
                            <Trash2 size={11} />
                          </button>

                          <div>
                            <p className="font-extrabold truncate max-w-[85px] leading-tight font-sans print:font-bold print:max-w-full">
                              {shift.employee_name}
                            </p>
                            <p className="text-[9px] font-bold opacity-80 uppercase font-mono mt-0.5 print:text-[10px]">
                              {shift.shift_type}
                            </p>
                          </div>
                          
                          {shift.notes && (
                            <p 
                              className="text-[8px] italic opacity-75 truncate mt-0.5 print:text-[8px]" 
                              title={shift.notes}
                            >
                              Obs: {shift.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {dayShifts.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/60 dark:text-slate-500 text-center italic py-6 select-none print:text-gray-400">
                        Sin guardias
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORMULARIO MODAL (ASIGNAR TURNO) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl w-full max-w-lg border border-primary/20 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <CalendarDays className="text-primary" size={20} />
                Asignar Turno de Guardia
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  handleResetForm();
                }}
                className="p-1.5 text-muted-foreground hover:text-text-main rounded-lg hover:bg-muted/30 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Nombre del Trabajador</label>
                  <input
                    type="text"
                    required
                    className="input-premium w-full text-sm font-semibold"
                    placeholder="Ej. Juan Pérez"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Fecha del Turno</label>
                    <input
                      type="date"
                      required
                      className="input-premium w-full text-sm font-mono"
                      value={shiftDate}
                      onChange={(e) => setShiftDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tipo de Turno</label>
                    <select
                      className="input-premium w-full text-sm"
                      value={shiftType}
                      onChange={(e) => setShiftType(e.target.value as any)}
                    >
                      {SHIFT_TYPES.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Observación / Nota (Opcional)</label>
                  <input
                    type="text"
                    className="input-premium w-full text-sm"
                    placeholder="Ej. Reemplazo de guardia o guardia de feriado"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border-main/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    handleResetForm();
                  }}
                  className="btn-secondary py-2 px-5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

