import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHA-256 hash function
async function hashValue(value: string): Promise<string> {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format phone for Meta (E.164 without +)
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, eventName, eventId } = await req.json();

    if (!orderId || !eventName) {
      return new Response(
        JSON.stringify({ error: 'orderId and eventName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Get store settings
    const { data: settings } = await supabase
      .from('store_settings')
      .select('meta_pixel_id, meta_access_token')
      .limit(1)
      .single();

    if (!settings?.meta_pixel_id || !settings?.meta_access_token) {
      console.log('Meta Pixel not configured');
      return new Response(
        JSON.stringify({ error: 'Meta Pixel not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixelId = settings.meta_pixel_id;
    const accessToken = settings.meta_access_token;

    // Get order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    // Hash user data
    const nameParts = order.customer_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const hashedEmail = order.customer_email ? await hashValue(order.customer_email) : null;
    const hashedPhone = order.customer_phone ? await hashValue(formatPhone(order.customer_phone)) : null;
    const hashedFirstName = await hashValue(firstName);
    const hashedLastName = await hashValue(lastName);

    // Build event data
    const eventTime = Math.floor(Date.now() / 1000);
    const generatedEventId = eventId || `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const userData: Record<string, any> = {
      client_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip'),
      client_user_agent: req.headers.get('user-agent'),
      country: ['br'],
    };

    if (hashedEmail) userData.em = [hashedEmail];
    if (hashedPhone) userData.ph = [hashedPhone];
    if (hashedFirstName) userData.fn = [hashedFirstName];
    if (hashedLastName) userData.ln = [hashedLastName];

    const eventData = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          event_id: generatedEventId,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: 'BRL',
            value: order.total,
            content_type: 'product',
            content_ids: orderItems?.map(item => item.product_id) || [],
            contents: orderItems?.map(item => ({
              id: item.product_id,
              quantity: item.quantity,
            })) || [],
            num_items: orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          },
        },
      ],
    };

    // Send to Meta Conversions API
    const metaUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const responseData = await response.json();

    // Log the conversion
    await supabase.from('meta_conversion_logs').insert({
      order_id: orderId,
      event_name: eventName,
      event_id: generatedEventId,
      pixel_id: pixelId,
      method: 'server_side',
      status: response.ok ? 'success' : 'failed',
      response: responseData,
      error_message: response.ok ? null : JSON.stringify(responseData),
    });

    console.log(`[Meta CAPI] ${eventName} sent for order ${orderId}:`, response.ok ? 'success' : 'failed');

    return new Response(
      JSON.stringify({ success: response.ok, eventId: generatedEventId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Meta CAPI] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
