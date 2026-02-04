-- Corrigir políticas permissivas para order_items
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR orders.user_id IS NULL))
);

-- Corrigir políticas permissivas para order_item_options
DROP POLICY IF EXISTS "Users can create order item options" ON public.order_item_options;
CREATE POLICY "Users can create order item options" ON public.order_item_options FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_options.order_item_id AND (o.user_id = auth.uid() OR o.user_id IS NULL)
    )
);