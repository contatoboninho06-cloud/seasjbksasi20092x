import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYEVO_API = "https://apiv2.payevo.com.br/functions/v1";

interface PixGatewayRequest {
  orderId: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document?: string;
  };
  description?: string;
}

interface GatewayResult {
  success: boolean;
  transactionId?: string;
  qrcode?: string;
  expirationDate?: string;
  gateway?: string;
  error?: string;
}

// Try Payevo gateway
async function tryPayevo(
  secretKey: string,
  orderId: string,
  amount: number,
  customer: { name: string; email: string; phone: string },
  postbackUrl: string
): Promise<GatewayResult> {
  try {
    const authHeader = `Basic ${btoa(`${secretKey}:x`)}`;
    const amountInCents = Math.round(amount * 100);

    const payevoPayload = {
      paymentMethod: "PIX",
      amount: amountInCents,
      postbackUrl,
      customer: {
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone.replace(/\D/g, ""),
      },
      items: [
        {
          title: "Iptv",
          unitPrice: amountInCents,
          quantity: 1,
          externalRef: "Iptv",
        },
      ],
      pix: {
        expirationMinutes: 5,
      },
      metadata: {
        produto: "Iptv",
        orderId: orderId,
      },
      ip: "213.123.123.13",
    };

    console.log("Trying Payevo gateway...");
    
    const response = await fetch(`${PAYEVO_API}/transactions`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payevoPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Payevo API error:", data);
      return { success: false, error: "Payevo API error" };
    }

    const transactionId = data.transaction?.id || data.id;
    const pixQrcode = data.pix?.qrcode || data.qrcode;
    const expirationDate = data.pix?.expirationDate || data.expirationDate;

    if (!transactionId || !pixQrcode) {
      console.error("Invalid Payevo response:", data);
      return { success: false, error: "Invalid Payevo response" };
    }

    console.log("Payevo transaction created successfully:", transactionId);
    
    return {
      success: true,
      transactionId,
      qrcode: pixQrcode,
      expirationDate,
      gateway: "payevo",
    };
  } catch (error) {
    console.error("Payevo error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Try Hypepay gateway
async function tryHypepay(
  apiKey: string,
  baseUrl: string,
  orderId: string,
  amount: number,
  description: string,
  customer: { name: string; email: string; phone: string; document?: string }
): Promise<GatewayResult> {
  try {
    const amountInCents = Math.round(amount * 100);

    const hypepayPayload = {
      amount: amountInCents,
      description: description || `Pedido #${orderId.slice(0, 8).toUpperCase()}`,
      customer: {
        name: customer.name,
        email: customer.email || "",
        document: customer.document || "",
        phone: customer.phone.replace(/\D/g, ""),
      },
    };

    console.log("Trying Hypepay gateway...", JSON.stringify(hypepayPayload));
    
    const response = await fetch(`${baseUrl}/api/v1/transactions`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(hypepayPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Hypepay API error:", data);
      return { success: false, error: "Hypepay API error" };
    }

    const transactionId = data.transactionId;
    const qrCode = data.qr_code;

    if (!transactionId || !qrCode) {
      console.error("Invalid Hypepay response:", data);
      return { success: false, error: "Invalid Hypepay response" };
    }

    // Calculate expiration (5 minutes from now)
    const expirationDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log("Hypepay transaction created successfully:", transactionId);
    
    return {
      success: true,
      transactionId,
      qrcode: qrCode,
      expirationDate,
      gateway: "hypepay",
    };
  } catch (error) {
    console.error("Hypepay error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, amount, customer, description }: PixGatewayRequest = await req.json();

    // Validate required fields
    if (!orderId || !amount || !customer?.name || !customer?.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch gateway settings from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("payevo_secret_key, hypepay_api_key, hypepay_base_url, primary_gateway")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch gateway settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      payevo_secret_key,
      hypepay_api_key,
      hypepay_base_url,
      primary_gateway = "payevo",
    } = settings || {};

    // Determine gateway order based on primary_gateway setting
    const gatewayOrder = primary_gateway === "hypepay"
      ? ["hypepay", "payevo"]
      : ["payevo", "hypepay"];

    console.log("Gateway order:", gatewayOrder);

    let result: GatewayResult | null = null;
    const postbackUrl = `${supabaseUrl}/functions/v1/payevo-webhook`;

    // Try gateways in order
    for (const gateway of gatewayOrder) {
      if (gateway === "payevo" && payevo_secret_key) {
        result = await tryPayevo(payevo_secret_key, orderId, amount, customer, postbackUrl);
        
        if (result.success) {
          // Update order with Payevo transaction data
          await supabase
            .from("orders")
            .update({
              payevo_transaction_id: result.transactionId,
              pix_qrcode: result.qrcode,
              pix_expiration: result.expirationDate,
              payment_gateway: "payevo",
            })
            .eq("id", orderId);
          
          break;
        }
        console.log("Payevo failed, trying fallback...");
      }

      if (gateway === "hypepay" && hypepay_api_key && hypepay_base_url) {
        result = await tryHypepay(
          hypepay_api_key,
          hypepay_base_url,
          orderId,
          amount,
          description || `Pedido #${orderId.slice(0, 8).toUpperCase()}`,
          customer
        );
        
        if (result.success) {
          // Update order with Hypepay transaction data
          await supabase
            .from("orders")
            .update({
              hypepay_transaction_id: result.transactionId,
              pix_qrcode: result.qrcode,
              pix_expiration: result.expirationDate,
              payment_gateway: "hypepay",
            })
            .eq("id", orderId);
          
          break;
        }
        console.log("Hypepay failed...");
      }
    }

    // Check if any gateway succeeded
    if (result?.success) {
      return new Response(
        JSON.stringify({
          transactionId: result.transactionId,
          qrcode: result.qrcode,
          expirationDate: result.expirationDate,
          gateway: result.gateway,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No gateway worked
    console.error("All gateways failed");
    return new Response(
      JSON.stringify({ 
        error: "No gateway available", 
        message: "All payment gateways failed. Please use manual PIX." 
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
