import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYEVO_API = "https://apiv2.payevo.com.br/functions/v1";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get transaction ID from query params
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing transactionId parameter" }),
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

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(`${settings.payevo_secret_key}:x`)}`;

    // Query Payevo API
    const payevoResponse = await fetch(`${PAYEVO_API}/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const payevoData = await payevoResponse.json();

    if (!payevoResponse.ok) {
      console.error("Payevo API error:", payevoData);
      return new Response(
        JSON.stringify({ error: "Payevo API error", details: payevoData }),
        { status: payevoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payevo transaction status:", payevoData);

    // If status is paid, update the order
    const status = payevoData.status || payevoData.data?.status;
    if (status === "paid") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("payevo_transaction_id", transactionId);

      if (updateError) {
        console.error("Error updating order:", updateError);
      } else {
        console.log("Order marked as paid");
      }
    }

    return new Response(
      JSON.stringify({
        transactionId,
        status: status,
        data: payevoData,
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
