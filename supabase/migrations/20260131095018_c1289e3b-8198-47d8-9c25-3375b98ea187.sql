-- Add new customization fields to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS store_subtitle text DEFAULT 'Delivery de Qualidade',
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS meta_description text DEFAULT 'O melhor delivery da região';

-- Add comment for documentation
COMMENT ON COLUMN public.store_settings.store_subtitle IS 'Subtítulo exibido abaixo do nome da loja';
COMMENT ON COLUMN public.store_settings.favicon_url IS 'URL do favicon do site';
COMMENT ON COLUMN public.store_settings.meta_description IS 'Descrição para SEO e meta tags';