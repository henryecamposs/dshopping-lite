// dShopping Lite - Supabase Client Setup
// Configuración del cliente Supabase para interactuar con la base de datos PostgreSQL

import { createClient } from '@supabase/supabase-js';

// Claves provistas por el cliente
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://kjpyohwkkeqhmkomzebv.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_2AwN62C79H6y-O09e4Bx_w_vmLeeDB5';

// Inicializar y exportar el cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
