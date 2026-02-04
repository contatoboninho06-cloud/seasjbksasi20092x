-- Add Payevo integration columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payevo_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS pix_qrcode TEXT,
ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ;

-- Add Payevo secret key to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS payevo_secret_key TEXT;

-- Add index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_payevo_transaction_id ON public.orders(payevo_transaction_id);