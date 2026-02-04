export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type AppRole = 'admin' | 'user';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  stock_quantity: number;
  preparation_time: number;
  product_code: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface VariantGroup {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  variants?: ProductOption[];
}

export interface ProductOption {
  id: string;
  product_id: string;
  group_id: string | null;
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_available: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_ip: string | null;
  customer_device: 'mobile' | 'desktop' | null;
  address_id: string | null;
  delivery_address: string | null;
  is_pickup: boolean;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  notes: string | null;
  estimated_delivery_time: string | null;
  payevo_transaction_id: string | null;
  hypepay_transaction_id: string | null;
  payment_gateway: string | null;
  pix_qrcode: string | null;
  pix_expiration: string | null;
  gclid: string | null;
  utm_data: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface BlockedCustomer {
  id: string;
  block_type: 'cpf' | 'email' | 'phone' | 'ip';
  block_value: string;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GoogleAdsConversionLog {
  id: string;
  order_id: string;
  conversion_label: string;
  conversion_value: number;
  currency: string;
  transaction_id: string | null;
  gclid: string | null;
  method: 'gtag' | 'datalayer' | 'server_side';
  status: 'success' | 'failed';
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  options?: OrderItemOption[];
}

export interface OrderItemOption {
  id: string;
  order_item_id: string;
  option_name: string;
  option_price: number;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_subtitle: string | null;
  store_phone: string | null;
  store_email: string | null;
  store_address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  meta_description: string | null;
  pix_key: string | null;
  pix_key_type: string;
  pix_beneficiary: string | null;
  min_order_value: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  registration_enabled: boolean;
  payevo_secret_key: string | null;
  hypepay_api_key: string | null;
  hypepay_base_url: string | null;
  primary_gateway: string | null;
  google_ads_conversion_id: string | null;
  google_ads_labels: Record<string, string> | null;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  utmify_token: string | null;
  utmify_pixel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaConversionLog {
  id: string;
  order_id: string | null;
  event_name: string;
  event_id: string;
  pixel_id: string;
  method: 'client_side' | 'server_side';
  status: 'success' | 'failed';
  response: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
}

export interface UtmifyConversionLog {
  id: string;
  order_id: string | null;
  event_type: 'initiate_checkout' | 'purchase';
  status_sent: string;
  response_status: number | null;
  response_body: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  zip_code_start: string;
  zip_code_end: string;
  neighborhood: string | null;
  city: string | null;
  delivery_fee: number;
  delivery_time: number;
  is_active: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  selectedOptions?: ProductOption[];
  selectedVariant?: ProductOption;
}
