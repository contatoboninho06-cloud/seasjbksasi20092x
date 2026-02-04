-- Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar enum para status de pedido
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

-- Criar enum para status de pagamento
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabela de categorias de produtos
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    preparation_time INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de opcionais/adicionais de produtos
CREATE TABLE public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de endereços de entrega
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    delivery_address TEXT,
    is_pickup BOOLEAN DEFAULT false,
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_method TEXT DEFAULT 'pix',
    notes TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de opcionais dos itens do pedido
CREATE TABLE public.order_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
    option_name TEXT NOT NULL,
    option_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações da loja
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT DEFAULT 'Churrascaria Gourmet',
    store_phone TEXT,
    store_email TEXT,
    store_address TEXT,
    logo_url TEXT,
    banner_url TEXT,
    pix_key TEXT,
    pix_key_type TEXT DEFAULT 'cpf',
    pix_beneficiary TEXT,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    delivery_time_min INTEGER DEFAULT 30,
    delivery_time_max INTEGER DEFAULT 60,
    is_open BOOLEAN DEFAULT true,
    opening_time TIME DEFAULT '11:00',
    closing_time TIME DEFAULT '23:00',
    working_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de taxas de entrega por CEP
CREATE TABLE public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code_start TEXT NOT NULL,
    zip_code_end TEXT NOT NULL,
    neighborhood TEXT,
    city TEXT,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_time INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cupons de desconto
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para categories (público para leitura)
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para products (público para leitura)
CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para product_options (público para leitura)
CREATE POLICY "Anyone can view available options" ON public.product_options FOR SELECT USING (is_available = true);
CREATE POLICY "Admins can manage product options" ON public.product_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para addresses
CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all addresses" ON public.addresses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para order_items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para order_item_options
CREATE POLICY "Users can view own order item options" ON public.order_item_options FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_options.order_item_id AND o.user_id = auth.uid()
    )
);
CREATE POLICY "Users can create order item options" ON public.order_item_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage order item options" ON public.order_item_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para store_settings (público para leitura)
CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para delivery_zones (público para leitura)
CREATE POLICY "Anyone can view active delivery zones" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para coupons
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Habilitar realtime para pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Inserir configurações padrão da loja
INSERT INTO public.store_settings (
    store_name, 
    store_phone, 
    pix_key, 
    pix_key_type, 
    pix_beneficiary,
    min_order_value,
    delivery_time_min,
    delivery_time_max
) VALUES (
    'Churrascaria Gourmet',
    '(11) 99999-9999',
    '12345678901',
    'cpf',
    'Churrascaria Gourmet LTDA',
    25.00,
    30,
    60
);

-- Inserir categorias de exemplo
INSERT INTO public.categories (name, description, display_order) VALUES
('Carnes Nobres', 'Seleção premium de cortes especiais', 1),
('Marmitas', 'Refeições completas prontas para consumo', 2),
('Combos', 'Combinações especiais com desconto', 3),
('Acompanhamentos', 'Complementos para sua refeição', 4),
('Bebidas', 'Refrigerantes, sucos e cervejas', 5);

-- Inserir produtos de exemplo
INSERT INTO public.products (category_id, name, description, price, is_featured, stock_quantity, preparation_time) VALUES
((SELECT id FROM public.categories WHERE name = 'Carnes Nobres'), 'Picanha na Brasa', 'Picanha premium grelhada no ponto, acompanha farofa e vinagrete', 89.90, true, 50, 35),
((SELECT id FROM public.categories WHERE name = 'Carnes Nobres'), 'Costela Premium', 'Costela bovina assada lentamente por 12 horas', 79.90, true, 30, 40),
((SELECT id FROM public.categories WHERE name = 'Carnes Nobres'), 'Fraldinha Grelhada', 'Fraldinha suculenta na brasa com tempero especial', 69.90, false, 40, 30),
((SELECT id FROM public.categories WHERE name = 'Marmitas'), 'Marmitex Tradicional', 'Arroz, feijão, farofa, vinagrete e carne do dia', 29.90, true, 100, 15),
((SELECT id FROM public.categories WHERE name = 'Marmitas'), 'Marmitex Executivo', 'Arroz, feijão tropeiro, farofa, salada e picanha', 45.90, true, 80, 20),
((SELECT id FROM public.categories WHERE name = 'Marmitas'), 'Marmitex Fitness', 'Arroz integral, legumes grelhados e frango desfiado', 35.90, false, 60, 15),
((SELECT id FROM public.categories WHERE name = 'Combos'), 'Combo Família', '1kg de picanha + 1kg de fraldinha + acompanhamentos para 4 pessoas', 189.90, true, 20, 50),
((SELECT id FROM public.categories WHERE name = 'Combos'), 'Combo Casal', '500g de picanha + acompanhamentos para 2 pessoas', 119.90, false, 35, 40),
((SELECT id FROM public.categories WHERE name = 'Acompanhamentos'), 'Farofa Especial', 'Farofa com bacon e ovos - porção individual', 12.90, false, 200, 5),
((SELECT id FROM public.categories WHERE name = 'Acompanhamentos'), 'Vinagrete', 'Vinagrete tradicional - porção individual', 8.90, false, 200, 5),
((SELECT id FROM public.categories WHERE name = 'Acompanhamentos'), 'Arroz Branco', 'Porção de arroz branco soltinho', 9.90, false, 200, 5),
((SELECT id FROM public.categories WHERE name = 'Bebidas'), 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite', 6.90, false, 500, 0),
((SELECT id FROM public.categories WHERE name = 'Bebidas'), 'Suco Natural', 'Laranja, limão ou maracujá - 500ml', 12.90, false, 100, 5),
((SELECT id FROM public.categories WHERE name = 'Bebidas'), 'Cerveja Long Neck', 'Heineken, Budweiser ou Original', 14.90, false, 200, 0);

-- Inserir zonas de entrega de exemplo
INSERT INTO public.delivery_zones (zip_code_start, zip_code_end, neighborhood, city, delivery_fee, delivery_time) VALUES
('01000000', '01999999', 'Centro', 'São Paulo', 5.00, 30),
('02000000', '02999999', 'Zona Norte', 'São Paulo', 8.00, 40),
('03000000', '03999999', 'Zona Leste', 'São Paulo', 10.00, 50),
('04000000', '04999999', 'Zona Sul', 'São Paulo', 8.00, 40),
('05000000', '05999999', 'Zona Oeste', 'São Paulo', 7.00, 35);