// dShopping Lite - Componente Layout & Navegación Global
// Estructura visual premium con barra lateral, control cambiario del día y toggler de Modo Claro/Oscuro

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  FileText, 
  LogOut, 
  TrendingUp, 
  Save, 
  Menu, 
  X, 
  Building2,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';

interface LayoutProps {
  currentView: string;
  setView: (view: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children }) => {
  const { user, company, logout } = useAuthStore();
  const { currentRate, fetchCurrentRate, updateCurrentRate, fetchLiveBCVRate } = useExchangeStore();
  
  const [rateInput, setRateInput] = useState<string>('45.00');
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);

  // Estado para el control del Tema Claro/Oscuro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Intentar leer preferencia del sistema o de localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Efecto para sincronizar el tema con la clase .dark de HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Cargar la tasa cambiaria inicial al montar el componente
  useEffect(() => {
    if (company?.id) {
      fetchCurrentRate(company.id).then((rateVal) => {
        setRateInput(rateVal.toString());
      });
    }
  }, [company?.id, fetchCurrentRate]);

  // Sincronizar el input local si la tasa del store cambia
  useEffect(() => {
    if (currentRate?.rate_value) {
      setRateInput(currentRate.rate_value.toString());
    }
  }, [currentRate?.rate_value]);

  const handleSaveRate = async () => {
    if (!company?.id) return;
    const numValue = parseFloat(rateInput);
    if (isNaN(numValue) || numValue <= 0) {
      Swal.fire({
        title: 'Valor Inválido',
        text: 'Por favor ingrese una tasa cambiaria numérica válida.',
        icon: 'warning',
        confirmButtonColor: '#8b5cf6',
        background: isDarkMode ? '#1e1b4b' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
      });
      return;
    }
    const success = await updateCurrentRate(company.id, numValue);
    if (success) {
      setIsEditingRate(false);
      Swal.fire({
        title: 'Tasa Guardada',
        text: `La tasa cambiaria se ha actualizado a ${numValue.toFixed(2)} Bs/$ exitosamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: isDarkMode ? '#1e1b4b' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
      });
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al guardar la tasa en la base de datos.',
        icon: 'error',
        confirmButtonColor: '#8b5cf6',
        background: isDarkMode ? '#1e1b4b' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
      });
    }
  };

  const handleFetchBCVRate = async () => {
    if (!company?.id) return;
    setIsFetchingRate(true);
    try {
      const res = await fetchLiveBCVRate();
      if (res.success && res.rate) {
        const confirmed = await Swal.fire({
          title: 'Tasa Oficial BCV',
          text: `La tasa oficial del BCV encontrada es de ${res.rate.toFixed(2)} Bs/$. ¿Desea actualizar la tasa del día a este valor?`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#8b5cf6',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, actualizar',
          cancelButtonText: 'Cancelar',
          background: isDarkMode ? '#1e1b4b' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
        });

        if (confirmed.isConfirmed) {
          const success = await updateCurrentRate(company.id, res.rate);
          if (success) {
            setRateInput(res.rate.toString());
            Swal.fire({
              title: 'Tasa Sincronizada',
              text: `Se ha establecido la tasa oficial de ${res.rate.toFixed(2)} Bs/$ exitosamente.`,
              icon: 'success',
              timer: 2500,
              showConfirmButton: false,
              background: isDarkMode ? '#1e1b4b' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
            });
          } else {
            Swal.fire({
              title: 'Error',
              text: 'No se pudo guardar la tasa en la base de datos.',
              icon: 'error',
              confirmButtonColor: '#8b5cf6',
              background: isDarkMode ? '#1e1b4b' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
            });
          }
        }
      } else {
        Swal.fire({
          title: 'Error de Sincronización',
          text: res.error || 'No se pudo obtener la tasa oficial en este momento.',
          icon: 'error',
          confirmButtonColor: '#8b5cf6',
          background: isDarkMode ? '#1e1b4b' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Error',
        text: err.message || 'Ocurrió un error inesperado al conectar con el servidor cambiario.',
        icon: 'error',
        confirmButtonColor: '#8b5cf6',
        background: isDarkMode ? '#1e1b4b' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
      });
    } finally {
      setIsFetchingRate(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Facturas', icon: Receipt },
    { id: 'providers', label: 'Proveedores', icon: Users },
    { id: 'reports', label: 'Reportes', icon: FileText }
  ];

  return (
    <div className="min-h-screen flex bg-bg-main text-text-main transition-colors duration-300">
      {/* BARRA LATERAL (Escritorio) */}
      <aside className="w-64 glass-panel border-r border-border-main hidden md:flex flex-col no-print">
        {/* LOGO */}
        <div className="p-6 border-b border-border-main flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl text-white shadow-md shadow-primary/20">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">dShopping</h1>
            <span className="text-xs text-primary font-bold">Lite • Multi-Empresa</span>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                    : 'text-muted-foreground hover:bg-muted/20 hover:text-text-main'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* PERFIL DE USUARIO & EMPRESA */}
        <div className="p-4 border-t border-border-main bg-muted/20">
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Empresa Activa</p>
            <p className="text-sm font-bold truncate">{company?.name}</p>
            <p className="text-xs text-primary font-mono truncate">RIF: {company?.rif}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Serial: {company?.serial_code}</p>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold uppercase">
              {user?.full_name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full btn-secondary py-2 border-red-900/15 hover:border-red-900/40 hover:bg-red-500/5 hover:text-red-500"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* BARRA SUPERIOR */}
        <header className="h-20 glass-panel border-b border-border-main flex items-center justify-between px-6 z-10 no-print">
          {/* Botón menú móvil */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-muted-foreground hover:text-text-main"
          >
            <Menu size={24} />
          </button>

          {/* Nombre de la sección */}
          <div className="hidden md:block">
            <h2 className="text-lg font-bold capitalize">
              {navItems.find(n => n.id === currentView)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* INTERRUPTOR DE MODO CLARO Y OSCURO */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl border border-border-main hover:bg-muted/30 transition-all cursor-pointer text-muted-foreground hover:text-text-main"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-primary" />}
            </button>

            {/* VISOR DE TASA DE CAMBIO GLOBAL */}
            <div className="flex items-center gap-4 bg-muted/20 border border-border-main rounded-2xl px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-500">
                <TrendingUp size={18} className="animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tasa del Día</span>
              </div>
              
              <div className="flex items-center gap-2">
                {isEditingRate && user?.role !== 'viewer' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-20 bg-muted/30 border border-border-main rounded-lg px-2 py-1 text-sm font-semibold text-emerald-500 focus:outline-none focus:border-emerald-500 text-center"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-muted-foreground font-semibold font-mono">Bs.</span>
                    <button
                      onClick={handleSaveRate}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors cursor-pointer"
                      title="Guardar Tasa"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingRate(false);
                        setRateInput(currentRate?.rate_value.toString() || '45.00');
                      }}
                      className="text-muted-foreground hover:text-text-main text-xs px-1.5"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono">
                      {currentRate ? currentRate.rate_value.toFixed(2) : '45.00'}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold font-mono">Bs. / $</span>
                    {user?.role !== 'viewer' && (
                      <div className="flex items-center gap-2 ml-1">
                        <button
                          onClick={() => setIsEditingRate(true)}
                          className="text-xs text-primary hover:text-accent font-semibold px-2 py-1 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={handleFetchBCVRate}
                          disabled={isFetchingRate}
                          className="text-xs text-emerald-650 dark:text-emerald-400 hover:text-emerald-500 font-semibold px-2.5 py-1 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          title="Sincronizar tasa oficial del BCV en tiempo real"
                        >
                          <RefreshCw size={12} className={isFetchingRate ? 'animate-spin' : ''} />
                          Obtener BCV
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN MÓVIL (MENU DESPLEGABLE) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 md:hidden flex justify-end">
            <div className="w-72 bg-bg-main h-full p-6 flex flex-col border-l border-border-main">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold">dShopping Lite</h3>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-muted-foreground hover:text-text-main"
                >
                  <X size={24} />
                </button>
              </div>

              {/* NAVEGACIÓN MÓVIL */}
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'text-muted-foreground hover:bg-muted/20 hover:text-text-main'
                      }`}
                    >
                      <Icon size={20} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* PERFIL MÓVIL */}
              <div className="pt-6 border-t border-border-main">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Empresa: {company?.name}</p>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                    {user?.full_name.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </div>
                
                {/* Toggler móvil */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full btn-secondary mb-4 justify-between"
                >
                  <span className="text-sm">Tema de Interfaz</span>
                  {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-primary" />}
                </button>

                <button
                  onClick={logout}
                  className="w-full btn-secondary border-red-950/20 text-red-500 hover:bg-red-500/5"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
