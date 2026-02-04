import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HypepayRequest {
  orderId: string;
  amount: number;
  description: string;
  baseUrl: string;
  apiKey: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    document?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, description, baseUrl, apiKey, customer }: HypepayRequest = await req.json();

    // Validate required fields
    if (!orderId || !amount || !baseUrl || !apiKey || !customer?.name || !customer?.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Amount in cents
    const amountInCents = Math.round(amount * 100);

    // Build Hypepay payload following documentation
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

    console.log("Creating Hypepay transaction:", JSON.stringify(hypepayPayload));

    // Call Hypepay API
    const hypepayResponse = await fetch(`${baseUrl}/api/v1/transactions`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(hypepayPayload),
    });

    const hypepayData = await hypepayResponse.json();

    if (!hypepayResponse.ok) {
      console.error("Hypepay API error:", hypepayData);
      return new Response(
        JSON.stringify({ error: "Hypepay API error", details: hypepayData }),
        { status: hypepayResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Hypepay transaction created:", hypepayData);

    // Extract transaction data (following the documented response format)
    const transactionId = hypepayData.transactionId;
    const qrCode = hypepayData.qr_code;
    const status = hypepayData.status;

    if (!transactionId || !qrCode) {
      console.error("Invalid Hypepay response:", hypepayData);
      return new Response(
        JSON.stringify({ error: "Invalid Hypepay response", details: hypepayData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiration (5 minutes from now as default)
    const expirationDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        transactionId,
        qrcode: qrCode,
        expirationDate,
        status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
