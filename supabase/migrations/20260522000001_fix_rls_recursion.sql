-- dCompras Lite - Supabase Database Schema DDL
-- Desarrollado por @Dev_Node bajo la metodología SDD
-- Migración: Reparar recursión infinita en las políticas RLS de "users"

-- 1. Actualizar la función get_user_company_id para verificar valores nulos
-- y establecer explícitamente el search_path, previniendo loops infinitos
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Retornar NULL inmediatamente si no hay sesión activa de usuario
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Consultar el company_id del usuario perfilado
    RETURN (SELECT company_id FROM public.users WHERE id = p_user_id);
END;
$$;

-- 2. Confirmar la aplicación de las políticas RLS sobre la tabla de usuarios
-- para asegurar la carga segura y ágil de sesiones y vinculaciones.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
