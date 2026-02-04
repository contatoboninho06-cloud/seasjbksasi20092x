import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Payevo webhook received:", JSON.stringify(payload));

    // Extract status and transaction ID from webhook payload
    // Payevo sends data in the format: { data: { id, status, ... } }
    const data = payload.data || payload;
    const transactionId = data.id;
    const status = data.status;

    if (!transactionId) {
      console.error("Missing transaction ID in webhook");
      return new Response(
        JSON.stringify({ error: "Missing transaction ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook for transaction ${transactionId} with status: ${status}`);

    // Map Payevo status to our payment_status
    let paymentStatus: string | null = null;
    let orderStatus: string | null = null;

    switch (status) {
      case "paid":
        paymentStatus = "paid";
        orderStatus = "confirmed";
        break;
      case "refused":
      case "canceled":
        paymentStatus = "failed";
        orderStatus = "cancelled";
        break;
      case "waiting_payment":
        paymentStatus = "pending";
        break;
      default:
        console.log(`Unknown status: ${status}, no update needed`);
    }

    if (paymentStatus) {
      const updateData: Record<string, string> = { payment_status: paymentStatus };
      if (orderStatus) {
        updateData.status = orderStatus;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("payevo_transaction_id", transactionId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Order updated: payment_status=${paymentStatus}, status=${orderStatus || 'unchanged'}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
