// dShopping Lite - Zustand Auth Store
// Control de autenticación customizada y multi-empresa
// Refactorizado por @Dev_React bajo la metodología SDD

import { create } from 'zustand';
import { Company, User } from '../types';
import { authService } from '../services/authService';

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
  
  // Registro Multi-Empresa Custom Decoplado
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
      const data = await authService.loadSessionProfile();
      if (!data) {
        set({ session: null, user: null, company: null, loading: false });
        return false;
      }

      set({ session: data.session, user: data.user, company: data.company, loading: false });
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
      const data = await authService.login(email, password);
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
    try {
      await authService.logout();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      set({ user: null, company: null, session: null, loading: false, error: null });
    }
  },

  // Crear Empresa únicamente
  createCompanyOnly: async (companyName, companyRif) => {
    set({ loading: true, error: null });
    try {
      const newCompany = await authService.createCompanyOnly(companyName, companyRif);
      set({ loading: false });
      return { success: true, data: newCompany };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Registro de Usuario y Vinculación por Código Serial de Empresa
  registerUserWithSerial: async (fullName, email, password, serialCode, role = 'operator') => {
    set({ loading: true, error: null });
    try {
      const result = await authService.registerUserWithSerial(fullName, email, password, serialCode, role);
      set({ loading: false });
      return { success: true, needsConfirmation: result.needsConfirmation } as any;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  }
}));

