// dShopping Lite - Zustand Auth Store
// Control de autenticación customizada y multi-empresa

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Company, User } from '../types';

interface AuthState {
  user: User | null;
  company: Company | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Acciones de autenticación
  loadSessionProfile: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Registro Multi-Empresa Custom Decoplado (Evita recursiones y mejora UX)
  createCompanyOnly: (
    companyName: string,
    companyRif: string
  ) => Promise<{ success: boolean; data?: Company; error?: string }>;
  
  registerUserWithSerial: (
    fullName: string,
    email: string,
    password: string,
    serialCode: string,
    role?: 'admin' | 'operator'
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  session: null,
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Cargar sesión y perfil asociado al iniciar la aplicación
  loadSessionProfile: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        set({ session: null, user: null, company: null, loading: false });
        return false;
      }

      set({ session });

      // Consultar perfil de usuario customizado en public.users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !userProfile) {
        // Si no hay perfil aún pero existe la sesión de auth, cerrar sesión para evitar inconsistencia
        await supabase.auth.signOut();
        set({ session: null, user: null, company: null, loading: false });
        return false;
      }

      // Consultar información de la empresa vinculada
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single();

      if (companyError || !company) {
        set({ session: null, user: null, company: null, loading: false });
        return false;
      }

      set({ user: userProfile, company, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Iniciar sesión
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      set({ session: data.session });
      
      // Cargar perfil completo
      const success = await get().loadSessionProfile();
      return success;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Cerrar sesión
  logout: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, company: null, session: null, loading: false, error: null });
  },

  // Flujo 1: Crear Empresa únicamente (Paso 1)
  createCompanyOnly: async (companyName, companyRif) => {
    set({ loading: true, error: null });
    try {
      // 1. Generar código serial único para la empresa (e.g. COMP-XXXXXX)
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      const serialCode = `COMP-${randomCode}`;

      // 2. Insertar empresa en public.companies
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          rif: companyRif.trim().toUpperCase(),
          serial_code: serialCode
        })
        .select()
        .single();

      if (companyError || !newCompany) {
        throw new Error(`Error registrando la empresa: ${companyError?.message}`);
      }

      set({ loading: false });
      return { success: true, data: newCompany };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Flujo 2: Registro de Usuario y Vinculación por Código Serial de Empresa (Soporta rol opcional)
  registerUserWithSerial: async (fullName, email, password, serialCode, role = 'operator') => {
    set({ loading: true, error: null });
    try {
      // 1. Buscar la empresa mediante el Código Serial
      const { data: targetCompany, error: findError } = await supabase
        .from('companies')
        .select('*')
        .eq('serial_code', serialCode.trim().toUpperCase())
        .single();

      if (findError || !targetCompany) {
        throw new Error('Código Serial de empresa inválido. No se encontró ninguna empresa asociada.');
      }

      // 2. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        // Errores comunes de Supabase adaptados al español
        let friendlyMessage = authError.message;
        if (authError.message.includes('Password should be')) {
          friendlyMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists')) {
          friendlyMessage = 'El correo electrónico ya se encuentra registrado.';
        }
        throw new Error(`Error al registrarse: ${friendlyMessage}`);
      }

      // Manejar el caso silencioso de anti-enumeración de usuarios o fallas de retorno
      if (!authData || !authData.user) {
        throw new Error(
          'No se pudo completar el registro. El correo electrónico podría estar ya registrado o requiere confirmación de cuenta. Intenta iniciar sesión o verifica tu bandeja de entrada.'
        );
      }

      // Si el registro fue exitoso pero el usuario no tiene identidades asociadas,
      // suele significar que ya existía previamente en Supabase Auth (caso silencioso de anti-enumeración)
      if (authData.user.identities && authData.user.identities.length === 0) {
        throw new Error(
          'Este correo electrónico ya está registrado en la plataforma. Por favor, inicia sesión con tus credenciales o restablece tu contraseña.'
        );
      }

      // 3. Crear el perfil en la tabla users enlazado a la empresa encontrada
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          company_id: targetCompany.id,
          full_name: fullName,
          email: email,
          role: role,
          is_active: true
        });

      if (profileError) {
        if (profileError.message.includes('duplicate key')) {
          throw new Error('Ya existe un perfil asociado a este usuario.');
        }
        throw new Error(`Error al crear el perfil de usuario: ${profileError.message}`);
      }

      // Determinar si requiere confirmación de email (sesión nula al registrarse)
      const needsConfirmation = !authData.session;

      set({ loading: false });
      return { success: true, needsConfirmation };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  }
}));
