import React, { useState } from 'react';
import { StaffShift } from '../../../types';

// Mock data para previsualizar el UI. En producción se conectaría al store (ej. useShiftStore).
const MOCK_SHIFTS: StaffShift[] = [
  { id: '1', company_id: 'c1', employee_name: 'Juan Pérez', date: '2026-05-22', shift_type: 'Mañana', created_at: '' },
  { id: '2', company_id: 'c1', employee_name: 'María Gómez', date: '2026-05-22', shift_type: 'Tarde', created_at: '' },
  { id: '3', company_id: 'c1', employee_name: 'Carlos Ruiz', date: '2026-05-23', shift_type: 'Guardia Nocturna', created_at: '' },
  { id: '4', company_id: 'c1', employee_name: 'Ana López', date: '2026-05-24', shift_type: 'Libre', created_at: '' }
];

const SHIFT_COLORS: Record<string, string> = {
  'Mañana': 'bg-blue-100 text-blue-800 border-blue-200',
  'Tarde': 'bg-orange-100 text-orange-800 border-orange-200',
  'Integral': 'bg-purple-100 text-purple-800 border-purple-200',
  'Guardia Nocturna': 'bg-gray-800 text-white border-gray-900',
  'Libre': 'bg-green-100 text-green-800 border-green-200'
};

export const ShiftCalendar: React.FC = () => {
  const [shifts] = useState<StaffShift[]>(MOCK_SHIFTS);
  const [viewDate, setViewDate] = useState(new Date('2026-05-22'));

  // Generar fechas de la semana actual
  const startOfWeek = new Date(viewDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunes
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + 7);
    setViewDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(viewDate);
    prev.setDate(prev.getDate() - 7);
    setViewDate(prev);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Planificación de Turnos</h2>
        <div className="flex space-x-2">
          <button onClick={prevWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold">&larr;</button>
          <span className="py-1 px-4 font-medium text-gray-700">Semana del {startOfWeek.toLocaleDateString('es-VE')}</span>
          <button onClick={nextWeek} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 font-bold">&rarr;</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayShifts = shifts.filter(s => s.date === dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div key={idx} className={`min-h-[150px] border rounded-lg p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-center font-bold text-gray-600 border-b pb-1 mb-2">
                {date.toLocaleDateString('es-VE', { weekday: 'short' }).toUpperCase()}
                <br/>
                <span className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                  {date.getDate()}
                </span>
              </div>
              
              <div className="space-y-2">
                {dayShifts.map(shift => (
                  <div key={shift.id} className={`text-xs p-2 rounded border ${SHIFT_COLORS[shift.shift_type] || 'bg-gray-100'}`}>
                    <div className="font-bold truncate">{shift.employee_name}</div>
                    <div>{shift.shift_type}</div>
                  </div>
                ))}
                {dayShifts.length === 0 && (
                  <div className="text-xs text-gray-400 text-center italic py-2">Sin asignar</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
          + Asignar Turno
        </button>
      </div>
    </div>
  );
};
