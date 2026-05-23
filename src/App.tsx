// dShopping Lite - React App Entry & Router Orchestrator
// Orquestación del enrutamiento de vistas y restablecimiento de sesión

import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Invoices } from './views/Invoices';
import { Providers } from './views/Providers';
import { Expenses } from './views/Expenses';
import { Reports } from './views/Reports';
import { PriceTagGenerator } from './views/Utilities/PriceTags/PriceTagGenerator';
import { ShiftCalendar } from './views/Utilities/Shifts/ShiftCalendar';
import { BankReconciliation } from './views/BankReconciliation';
import { PaymentHistory } from './views/PaymentHistory';
import { PaymentMethods } from './views/PaymentMethods';
import { Building2 } from 'lucide-react';

export const App: React.FC = () => {
  const { session, user, loadSessionProfile, loading } = useAuthStore();
  const [currentView, setView] = useState<string>('dashboard');

  // Restablecer la sesión del usuario al cargar la aplicación
  useEffect(() => {
    loadSessionProfile();
  }, [loadSessionProfile]);

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4 text-text-main transition-colors duration-300">
        <div className="bg-primary p-3 rounded-2xl animate-bounce text-white shadow-xl shadow-primary/25">
          <Building2 size={32} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight animate-pulse">Cargando dShopping Lite...</h2>
          <span className="text-xs text-slate-500 font-medium">Validando sesión y aislamiento corporativo</span>
        </div>
      </div>
    );
  }

  // Ruteo condicional: Si no está autenticado, renderizar portal de Login
  if (!session || !user) {
    return <Login />;
  }

  // Ruteo condicional de vistas autenticadas en el Layout
  return (
    <Layout currentView={currentView} setView={setView}>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'invoices' && <Invoices />}
      {currentView === 'providers' && <Providers />}
      {currentView === 'expenses' && <Expenses />}
      {currentView === 'reports' && <Reports />}
      {currentView === 'reconciliation' && <BankReconciliation />}
      {currentView === 'payment-history' && <PaymentHistory />}
      {currentView === 'payment-methods' && <PaymentMethods />}
      {currentView === 'price-tags' && <PriceTagGenerator />}
      {currentView === 'shifts' && <ShiftCalendar />}
    </Layout>
  );
};

export default App;
