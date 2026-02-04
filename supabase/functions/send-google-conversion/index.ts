import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash SHA-256
async function sha256(str: string): Promise<string> {
  if (!str) return '';
  const normalized = str.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extrai primeiro e ultimo nome
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, conversionLabel, eventType = 'purchase' } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca configuracoes
    const { data: settings } = await supabase
      .from('store_settings')
      .select('google_ads_conversion_id, google_ads_labels')
      .limit(1)
      .single();

    if (!settings?.google_ads_conversion_id) {
      return new Response(
        JSON.stringify({ error: "Google Ads not configured", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversionId = settings.google_ads_conversion_id;
    const labels = (settings.google_ads_labels as Record<string, string>) || {};
    const label = conversionLabel || labels[eventType];

    if (!label) {
      return new Response(
        JSON.stringify({ error: "Conversion label not found", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica deduplicacao
    const { data: existingLog } = await supabase
      .from('google_ads_conversion_logs')
      .select('id')
      .eq('order_id', orderId)
      .eq('conversion_label', label)
      .eq('status', 'success')
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      console.log('Conversion already sent for this order');
      return new Response(
        JSON.stringify({ success: true, message: 'Already sent', deduplicated: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca dados do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Prepara Enhanced Conversions
    const { firstName, lastName } = splitName(order.customer_name);
    const emailHash = await sha256(order.customer_email || '');
    const phoneHash = await sha256(order.customer_phone?.replace(/\D/g, '') || '');
    const firstNameHash = await sha256(firstName);
    const lastNameHash = await sha256(lastName);

    // Extrai Conversion ID numerico (remove 'AW-')
    const numericConversionId = conversionId.replace('AW-', '');

    // Monta URL de conversao
    const baseUrl = `https://www.googleadservices.com/pagead/conversion/${numericConversionId}/`;
    const params = new URLSearchParams({
      value: order.total.toString(),
      currency_code: 'BRL',
      label: label,
      oid: orderId,
    });
    
    if (order.gclid) params.append('gclid', order.gclid);
    if (emailHash) params.append('em', emailHash);
    if (phoneHash) params.append('pn', phoneHash);
    if (firstNameHash) params.append('fn', firstNameHash);
    if (lastNameHash) params.append('ln', lastNameHash);

    const conversionUrl = `${baseUrl}?${params.toString()}`;
    console.log('Sending server-side conversion:', conversionUrl);

    // Envia conversao
    const response = await fetch(conversionUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const success = response.ok;
    const errorMessage = success ? null : await response.text();

    // Registra log
    await supabase.from('google_ads_conversion_logs').insert({
      order_id: orderId,
      conversion_label: label,
      conversion_value: order.total,
      currency: 'BRL',
      transaction_id: orderId,
      gclid: order.gclid,
      method: 'server_side',
      status: success ? 'success' : 'failed',
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ 
        success, 
        conversionId: numericConversionId,
        label,
        value: order.total,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
