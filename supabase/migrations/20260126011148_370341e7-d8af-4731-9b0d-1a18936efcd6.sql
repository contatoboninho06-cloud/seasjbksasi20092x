-- Add product_code column to products table
ALTER TABLE public.products ADD COLUMN product_code TEXT UNIQUE;

-- Add original_price column to products table for showing discounts
ALTER TABLE public.products ADD COLUMN original_price NUMERIC;

-- Add registration_enabled to store_settings
ALTER TABLE public.store_settings ADD COLUMN registration_enabled BOOLEAN DEFAULT true;

-- Create function to generate random 6-digit product code
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.products WHERE product_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.product_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate product_code on insert
CREATE TRIGGER set_product_code
BEFORE INSERT ON public.products
FOR EACH ROW
WHEN (NEW.product_code IS NULL)
EXECUTE FUNCTION public.generate_product_code();

-- Generate codes for existing products
UPDATE public.products 
SET product_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE product_code IS NULL;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));