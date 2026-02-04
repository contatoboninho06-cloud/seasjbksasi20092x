-- Create SECURITY DEFINER function to check order access without RLS SELECT restrictions
CREATE OR REPLACE FUNCTION public.can_access_order(order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = order_id
      AND (
        user_id IS NULL -- Anonymous order
        OR user_id = auth.uid() -- User's own order
        OR public.has_role(auth.uid(), 'admin') -- Admin access
      )
  )
$$;

-- Create SECURITY DEFINER function to check order item access
CREATE OR REPLACE FUNCTION public.can_access_order_item(order_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id
      AND (
        o.user_id IS NULL -- Anonymous order
        OR o.user_id = auth.uid() -- User's own order
        OR public.has_role(auth.uid(), 'admin') -- Admin access
      )
  )
$$;

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order item options" ON public.order_item_options;

-- Create new INSERT policy for order_items using SECURITY DEFINER function
CREATE POLICY "Users can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (public.can_access_order(order_id));

-- Create new INSERT policy for order_item_options using SECURITY DEFINER function
CREATE POLICY "Users can create order item options"
ON public.order_item_options
FOR INSERT
WITH CHECK (public.can_access_order_item(order_item_id));