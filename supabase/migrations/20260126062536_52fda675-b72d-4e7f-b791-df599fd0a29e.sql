-- Criar tabela de grupos de variantes
CREATE TABLE public.variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar colunas na tabela product_options
ALTER TABLE public.product_options 
ADD COLUMN group_id UUID REFERENCES public.variant_groups(id) ON DELETE CASCADE,
ADD COLUMN image_url TEXT,
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Habilitar RLS para variant_groups
ALTER TABLE public.variant_groups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para variant_groups
CREATE POLICY "Anyone can view active groups" ON public.variant_groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage groups" ON public.variant_groups
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_variant_groups_product ON public.variant_groups(product_id);
CREATE INDEX idx_product_options_group ON public.product_options(group_id);