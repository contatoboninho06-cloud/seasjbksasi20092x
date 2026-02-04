import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYEVO_API = "https://apiv2.payevo.com.br/functions/v1";

interface PayevoRequest {
  orderId: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
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

    const { orderId, amount, customer }: PayevoRequest = await req.json();

    // Validate required fields
    if (!orderId || !amount || !customer?.name || !customer?.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Payevo secret key from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("payevo_secret_key")
      .limit(1)
      .single();

    if (settingsError || !settings?.payevo_secret_key) {
      console.error("Error fetching Payevo settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Payevo not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Basic Auth header (secret_key:x)
    const authHeader = `Basic ${btoa(`${settings.payevo_secret_key}:x`)}`;

    // Amount in cents
    const amountInCents = Math.round(amount * 100);

    // Build Payevo payload following EXACT documentation
    const payevoPayload = {
      paymentMethod: "PIX",
      amount: amountInCents,
      postbackUrl: `${supabaseUrl}/functions/v1/payevo-webhook`,
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

    console.log("Creating Payevo transaction:", JSON.stringify(payevoPayload));

    // Call Payevo API
    const payevoResponse = await fetch(`${PAYEVO_API}/transactions`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payevoPayload),
    });

    const payevoData = await payevoResponse.json();

    if (!payevoResponse.ok) {
      console.error("Payevo API error:", payevoData);
      return new Response(
        JSON.stringify({ error: "Payevo API error", details: payevoData }),
        { status: payevoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payevo transaction created:", payevoData);

    // Extract transaction data
    const transactionId = payevoData.transaction?.id || payevoData.id;
    const pixQrcode = payevoData.pix?.qrcode || payevoData.qrcode;
    const expirationDate = payevoData.pix?.expirationDate || payevoData.expirationDate;

    if (!transactionId || !pixQrcode) {
      console.error("Invalid Payevo response:", payevoData);
      return new Response(
        JSON.stringify({ error: "Invalid Payevo response", details: payevoData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with Payevo data
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payevo_transaction_id: transactionId,
        pix_qrcode: pixQrcode,
        pix_expiration: expirationDate,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        transactionId,
        qrcode: pixQrcode,
        expirationDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
