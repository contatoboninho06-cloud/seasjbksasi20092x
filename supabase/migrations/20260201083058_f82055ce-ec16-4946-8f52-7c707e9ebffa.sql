-- Create checkout_analytics table for realtime tracking
CREATE TABLE IF NOT EXISTS public.checkout_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_method TEXT,
  products JSONB,
  subtotal NUMERIC,
  shipping_cost NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC,
  metadata JSONB,
  location JSONB,
  store_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indices for performance
CREATE INDEX idx_checkout_analytics_session_id ON checkout_analytics(session_id);
CREATE INDEX idx_checkout_analytics_created_at ON checkout_analytics(created_at DESC);
CREATE INDEX idx_checkout_analytics_event_type ON checkout_analytics(event_type);

-- Enable Row Level Security
ALTER TABLE checkout_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public insert (checkout can insert without auth)
CREATE POLICY "Allow public insert on checkout_analytics" ON checkout_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow read only for admins
CREATE POLICY "Admins can read checkout analytics" ON checkout_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete/update analytics
CREATE POLICY "Admins can manage checkout analytics" ON checkout_analytics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable Realtime with REPLICA IDENTITY FULL
ALTER TABLE checkout_analytics REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_analytics;