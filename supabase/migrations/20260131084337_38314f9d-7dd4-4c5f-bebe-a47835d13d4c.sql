-- Corrigir política de INSERT para orders (permitir usuários não logados)
DROP POLICY IF EXISTS "Users can create orders" ON orders;

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );