import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, eventType } = await req.json();

    if (!orderId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'orderId and eventType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store settings
    const { data: settings } = await supabase
      .from('store_settings')
      .select('utmify_token')
      .limit(1)
      .single();

    if (!settings?.utmify_token) {
      console.log('Utmify not configured');
      return new Response(
        JSON.stringify({ error: 'Utmify not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_name, quantity, unit_price, total_price')
      .eq('order_id', orderId);

    // Map eventType to Utmify status
    const statusMap: Record<string, string> = {
      'initiate_checkout': 'waiting_payment',
      'purchase': 'paid',
    };

    const status = statusMap[eventType] || 'waiting_payment';

    // Format phone (remove non-digits)
    const phone = order.customer_phone.replace(/\D/g, '');

    // Build Utmify payload (values in centavos)
    const utmifyPayload = {
      orderId: orderId,
      platform: 'custom',
      paymentMethod: 'pix',
      status: status,
      createdAt: order.created_at,
      approvedDate: status === 'paid' ? new Date().toISOString() : null,
      refundedAt: null,
      customer: {
        name: order.customer_name,
        email: order.customer_email || '',
        phone: phone,
        document: null,
        country: 'BR',
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip') || '',
      },
      products: orderItems?.map(item => ({
        id: item.product_name,
        name: item.product_name,
        planId: null,
        planName: null,
        quantity: item.quantity,
        priceInCents: Math.round(item.unit_price * 100),
      })) || [],
      trackingParameters: order.utm_data || {},
      commission: {
        totalPriceInCents: Math.round(order.total * 100),
        gatewayFeeInCents: 0,
        userCommissionInCents: Math.round(order.total * 100),
      },
      isTest: false,
    };

    // Send to Utmify API
    const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': settings.utmify_token,
      },
      body: JSON.stringify(utmifyPayload),
    });

    const responseData = await response.json().catch(() => ({}));

    // Log the conversion
    await supabase.from('utmify_conversion_logs').insert({
      order_id: orderId,
      event_type: eventType,
      status_sent: status,
      response_status: response.status,
      response_body: responseData,
      error_message: response.ok ? null : JSON.stringify(responseData),
    });

    console.log(`[Utmify] ${eventType} sent for order ${orderId}:`, response.ok ? 'success' : 'failed');

    return new Response(
      JSON.stringify({ success: response.ok, status: response.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Utmify] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
