-- Função para verificar se um usuário é admin
-- SECURITY DEFINER permite bypass das RLS policies de forma segura
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_id_param
      AND role = 'admin'
  )
$$;

-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated;