import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HypepayWebhookPayload {
  event: string;
  transactionId: string;
  amount: number;
  status: string;
  paidAt?: string;
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

    const payload: HypepayWebhookPayload = await req.json();
    
    console.log("Hypepay webhook received:", JSON.stringify(payload));

    // Only process PAYMENT_RECEIVED events
    if (payload.event !== "PAYMENT_RECEIVED" || payload.status !== "PAID") {
      console.log("Ignoring event:", payload.event, payload.status);
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transactionId } = payload;

    if (!transactionId) {
      console.error("Missing transactionId in webhook payload");
      return new Response(
        JSON.stringify({ error: "Missing transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find order by hypepay_transaction_id
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("hypepay_transaction_id", transactionId)
      .maybeSingle();

    if (findError) {
      console.error("Error finding order:", findError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      console.error("Order not found for transactionId:", transactionId);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already paid
    if (order.payment_status === "paid") {
      console.log("Order already paid:", order.id);
      return new Response(
        JSON.stringify({ received: true, message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order updated successfully:", order.id);

    return new Response(
      JSON.stringify({ received: true, orderId: order.id }),
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
