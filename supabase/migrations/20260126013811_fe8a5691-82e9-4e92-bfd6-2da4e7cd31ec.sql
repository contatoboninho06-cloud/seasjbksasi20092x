-- Inserir usuário como admin (solução imediata para o problema de acesso)
INSERT INTO public.user_roles (user_id, role)
VALUES ('feba845a-37d2-48c0-b64b-1586ba04c014', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Desabilitar novos cadastros após primeiro admin
UPDATE public.store_settings SET registration_enabled = false;

-- Criar bucket para assets da loja (logo/banner)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de assets por admins
CREATE POLICY "Admins can manage store assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'store-assets' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'store-assets' AND public.has_role(auth.uid(), 'admin'));

-- Política para visualização pública dos assets
CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-assets');

-- Permitir primeiro usuário se tornar admin quando não existe nenhum admin
CREATE POLICY "Allow first admin registration"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  AND role = 'admin'
);