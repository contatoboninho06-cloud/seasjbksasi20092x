-- Add Hypepay fields to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS hypepay_api_key TEXT,
ADD COLUMN IF NOT EXISTS hypepay_base_url TEXT DEFAULT 'https://api.hypepay.com.br',
ADD COLUMN IF NOT EXISTS primary_gateway TEXT DEFAULT 'payevo';

-- Add gateway tracking fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS hypepay_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN public.store_settings.primary_gateway IS 'Primary payment gateway: payevo or hypepay';
COMMENT ON COLUMN public.orders.payment_gateway IS 'Gateway used for payment: payevo, hypepay, or manual';