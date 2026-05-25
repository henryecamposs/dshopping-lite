// dShopping Lite - Vista de Login y Registro Multi-Empresa
// Diseño UI/UX premium con fondos de modo oscuro y paneles translúcidos

import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Building2, Key, Mail, User, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, createCompanyOnly, registerUserWithSerial, loading, error, setError } = useAuthStore();
  
  // Modos de Vista: 'login' | 'register_company' | 'register_user'
  const [viewMode, setViewMode] = useState<'login' | 'register_company' | 'register_user'>('login');
  
  // Pasos para Registro de Empresa (1: Datos de Empresa, 2: Datos de Administrador)
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
  const [createdCompany, setCreatedCompany] = useState<{ id: string; name: string; serial_code: string } | null>(null);
  
  // Datos comunes
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Datos específicos de Empresa
  const [companyName, setCompanyName] = useState<string>('');
  const [companyRif, setCompanyRif] = useState<string>('');
  const [generatedSerial, setGeneratedSerial] = useState<string | null>(null);

  // Datos específicos de Vinculación
  const [serialCode, setSerialCode] = useState<string>('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (viewMode === 'login') {
      if (!email || !password) {
        setError('Por favor complete todos los campos.');
        return;
      }
      await login(email, password);
    } else if (viewMode === 'register_company') {
      if (registrationStep === 1) {
        if (!companyName || !companyRif) {
          setError('El nombre y el RIF de la empresa son obligatorios.');
          return;
        }
        const res = await createCompanyOnly(companyName, companyRif);
        if (res.success && res.data) {
          setCreatedCompany(res.data);
          setGeneratedSerial(res.data.serial_code);
          setSuccessMsg(`¡Empresa "${res.data.name}" registrada con éxito! Proceda a registrar el usuario administrador.`);
          setRegistrationStep(2);
        }
      } else {
        if (!fullName || !email || !password || !createdCompany) {
          setError('Todos los campos del usuario administrador son obligatorios.');
          return;
        }
        const res = await registerUserWithSerial(fullName, email, password, createdCompany.serial_code, 'admin');
        if (res.success) {
          if ('needsConfirmation' in res && res.needsConfirmation) {
            setSuccessMsg(`¡Registro exitoso! Se ha enviado un enlace de confirmación al correo "${email}". Por favor, verifícalo para activar tu cuenta de administrador de "${createdCompany.name}".`);
          } else {
            setSuccessMsg(`¡Cuenta de Administrador registrada con éxito para "${createdCompany.name}"! Ahora puede iniciar sesión.`);
          }
          setViewMode('login');
          // Limpiar formulario y resetear estados
          setRegistrationStep(1);
          setCreatedCompany(null);
          setGeneratedSerial(null);
          setCompanyName('');
          setCompanyRif('');
          setFullName('');
          setEmail('');
          setPassword('');
        }
      }
    } else if (viewMode === 'register_user') {
      if (!fullName || !email || !password || !serialCode) {
        setError('Todos los campos incluyendo el Código Serial son requeridos.');
        return;
      }
      const res = await registerUserWithSerial(fullName, email, password, serialCode, 'operator');
      if (res.success) {
        if ('needsConfirmation' in res && res.needsConfirmation) {
          setSuccessMsg(`¡Registro exitoso! Se ha enviado un enlace de confirmación a tu correo electrónico "${email}". Por favor, verifícalo para activar tu cuenta e iniciar sesión.`);
        } else {
          setSuccessMsg('¡Cuenta registrada con éxito y vinculada a la empresa! Ahora puede iniciar sesión.');
        }
        setViewMode('login');
        // Transferir email a login para facilitar UX
        setFullName('');
        setSerialCode('');
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main flex items-center justify-center p-4 md:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Luces de fondo decorativas utilizando los colores del tema */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-accent/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-border-main">
        
        {/* PANEL LATERAL DE BRANDING (Izquierdo) - Elegante gradiente de los colores del tema */}
        <div className="lg:col-span-5 bg-gradient-to-br from-primary/30 via-slate-950 to-accent/30 p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border-main text-white">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-2xl text-white shadow-lg shadow-primary/25">
              <Building2 size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">dShopping</h1>
              <span className="text-xs text-primary font-bold uppercase tracking-wider">Lite • V1.0</span>
            </div>
          </div>

          <div className="my-8 lg:my-0 space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Control cambiario y cuentas por pagar en un solo lugar.
            </h2>
            <p className="text-slate-350 text-sm leading-relaxed">
              Diseñado para la gestión eficiente de facturas de compra con conversión automática basada en la tasa cambiaria del día. Totalmente multi-empresa.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/20 p-1.5 rounded-lg text-primary mt-0.5">
                  <Award size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Aislamiento por Empresa</p>
                  <p className="text-xs text-slate-400">Seguridad estricta a nivel de base de datos relacional.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/20 p-1.5 rounded-lg text-primary mt-0.5">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Cálculos Automatizados</p>
                  <p className="text-xs text-slate-400">Generación de fechas de vencimiento e IVA instantáneos.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            &copy; 2026 dPana Projects. Todos los derechos reservados.
          </div>
        </div>

        {/* PANEL DE FORMULARIO (Derecho) - Translúcido adaptable */}
        <div className="lg:col-span-7 bg-panel-main p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-text-main mb-2">
              {viewMode === 'login' && 'Iniciar Sesión'}
              {viewMode === 'register_company' && (
                registrationStep === 1 ? 'Registrar Nueva Empresa' : 'Registrar Administrador'
              )}
              {viewMode === 'register_user' && 'Vincularse a una Empresa'}
            </h3>
            <p className="text-slate-400 text-sm">
              {viewMode === 'login' && 'Ingrese sus credenciales para acceder a la plataforma.'}
              {viewMode === 'register_company' && (
                registrationStep === 1 
                  ? 'Paso 1: Registre la información fiscal de su empresa.' 
                  : 'Paso 2: Cree la cuenta del usuario administrador para su empresa.'
              )}
              {viewMode === 'register_user' && 'Cree su cuenta de operador utilizando el código serial corporativo.'}
            </p>
          </div>

          {/* MENSAJES DE ERROR / ÉXITO */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2">
              <ShieldAlert size={18} />
              <span className="text-xs font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl mb-6 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                <span className="text-xs font-bold">{successMsg}</span>
              </div>
              {generatedSerial && registrationStep === 1 && (
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 text-center font-mono">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Código Serial Corporativo</p>
                  <p className="text-xl font-black text-emerald-400 mt-1 select-all cursor-pointer">{generatedSerial}</p>
                  <p className="text-[9px] text-slate-500 mt-1">Comparta este código con su equipo para que puedan registrarse y vincularse.</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. MODO: LOGIN */}
            {viewMode === 'login' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="ejemplo@correo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Key size={18} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* 2. MODO: REGISTRAR EMPRESA (PASO 1) */}
            {viewMode === 'register_company' && registrationStep === 1 && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre de Empresa</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input-premium w-full"
                      placeholder="Empresa Demo, C.A."
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">RIF Comercial</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyRif}
                      onChange={(e) => setCompanyRif(e.target.value)}
                      className="input-premium w-full font-mono"
                      placeholder="J-12345678-9"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* 3. MODO: REGISTRAR EMPRESA (PASO 2) */}
            {viewMode === 'register_company' && registrationStep === 2 && createdCompany && (
              <div className="space-y-5">
                {/* Panel de Éxito y Código Serial */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-5 rounded-2xl space-y-3 shadow-lg shadow-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Empresa Registrada</p>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-300">{createdCompany.name}</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 dark:bg-slate-950/60 p-4 rounded-xl border border-emerald-500/25 text-center font-mono">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Código Serial Corporativo</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 select-all cursor-pointer tracking-wider">{createdCompany.serial_code}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                      Copie y guarde este código. Se utilizará para vincular a los operadores de su empresa.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo del Administrador</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="Juan Pérez"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="admin@empresa.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Key size={18} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. MODO: VINCULAR OPERADOR */}
            {viewMode === 'register_user' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código Serial de Empresa</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Building2 size={18} />
                    </span>
                    <input
                      type="text"
                      value={serialCode}
                      onChange={(e) => setSerialCode(e.target.value)}
                      className="input-premium w-full pl-11 font-mono text-primary tracking-wider placeholder:font-sans placeholder:text-sm uppercase"
                      placeholder="COMP-938210"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="Juan Pérez"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="ejemplo@correo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Key size={18} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-premium w-full pl-11"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BOTÓN DE ACCIÓN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-bold uppercase tracking-wider mt-4"
            >
              {loading ? 'Procesando...' : (
                viewMode === 'login' ? 'Acceder al Sistema' :
                viewMode === 'register_company' 
                  ? (registrationStep === 1 ? 'Registrar Empresa (Paso 1)' : 'Crear Cuenta de Administrador (Paso 2)') 
                  : 'Registrar y Vincular'
              )}
            </button>
          </form>

          {/* SELECTORES DE MODOS */}
          <div className="mt-8 pt-6 border-t border-slate-900 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
            {viewMode === 'login' ? (
              <>
                <button
                  onClick={() => { setViewMode('register_company'); setError(null); setSuccessMsg(null); setRegistrationStep(1); setCreatedCompany(null); }}
                  className="hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  ¿Desea registrar una nueva empresa?
                </button>
                <button
                  onClick={() => { setViewMode('register_user'); setError(null); setSuccessMsg(null); setRegistrationStep(1); setCreatedCompany(null); }}
                  className="hover:text-indigo-400 transition-colors cursor-pointer font-bold text-slate-300"
                >
                  Vincularse con Código Serial
                </button>
              </>
            ) : (
              <button
                onClick={() => { setViewMode('login'); setError(null); setSuccessMsg(null); setRegistrationStep(1); setCreatedCompany(null); }}
                className="hover:text-indigo-400 transition-colors cursor-pointer font-semibold flex items-center gap-1"
              >
                Volver a Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

