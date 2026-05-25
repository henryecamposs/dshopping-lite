// dShopping Lite - Servicio de Autenticación y Multi-Empresa
// Aislado por @Dev_Node bajo la metodología SDD

import { supabase } from '../lib/supabase';
import { Company, User } from '../types';

export const authService = {
  // Cargar sesión y perfil asociado al iniciar la aplicación
  loadSessionProfile: async (): Promise<{ session: any; user: User; company: Company } | null> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return null;
    }

    // Consultar perfil de usuario customizado en public.users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      await supabase.auth.signOut();
      return null;
    }

    // Consultar información de la empresa vinculada
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userProfile.company_id)
      .single();

    if (companyError || !company) {
      return null;
    }

    return { session, user: userProfile, company };
  },

  // Iniciar sesión
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Cerrar sesión
  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  // Crear Empresa únicamente
  createCompanyOnly: async (companyName: string, companyRif: string): Promise<Company> => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const serialCode = `COMP-${randomCode}`;

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

    return newCompany;
  },

  // Registro de Usuario y Vinculación por Código Serial de Empresa
  registerUserWithSerial: async (
    fullName: string,
    email: string,
    password: string,
    serialCode: string,
    role: 'admin' | 'operator' = 'operator'
  ): Promise<{ success: boolean; needsConfirmation: boolean }> => {
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
      let friendlyMessage = authError.message;
      if (authError.message.includes('Password should be')) {
        friendlyMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already exists')
      ) {
        friendlyMessage = 'El correo electrónico ya se encuentra registrado.';
      }
      throw new Error(`Error al registrarse: ${friendlyMessage}`);
    }

    if (!authData || !authData.user) {
      throw new Error(
        'No se pudo completar el registro. El correo electrónico podría estar ya registrado o requiere confirmación de cuenta.'
      );
    }

    if (authData.user.identities && authData.user.identities.length === 0) {
      throw new Error(
        'Este correo electrónico ya está registrado en la plataforma. Por favor, inicia sesión con tus credenciales.'
      );
    }

    // 3. Crear el perfil en la tabla users
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

    const needsConfirmation = !authData.session;
    return { success: true, needsConfirmation };
  }
};

