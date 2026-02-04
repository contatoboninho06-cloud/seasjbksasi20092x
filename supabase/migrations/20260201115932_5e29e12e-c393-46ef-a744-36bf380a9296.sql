-- Adicionar coluna customer_ip na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text;

-- Criar tabela de clientes bloqueados
CREATE TABLE IF NOT EXISTS public.blocked_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type text NOT NULL CHECK (block_type IN ('cpf', 'email', 'phone', 'ip')),
  block_value text NOT NULL,
  reason text,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(block_type, block_value)
);

-- Enable RLS
ALTER TABLE public.blocked_customers ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar bloqueios
CREATE POLICY "Admins can manage blocked customers"
  ON public.blocked_customers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Qualquer um pode verificar bloqueios (para o checkout)
CREATE POLICY "Anyone can check blocks"
  ON public.blocked_customers FOR SELECT
  USING (true);