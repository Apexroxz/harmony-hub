import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[stripe-webhook] Missing Supabase environment configuration");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const eventType = event.type;
    const sessionObj = event.data?.object;
    const sessionId = sessionObj?.id;

    if (sessionId) {
      if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded") {
        console.info(`[stripe-webhook] Recording completed payment for session: ${sessionId}`);
        const { error: updateError } = await supabase
          .from("support_transactions")
          .update({ status: "completed" })
          .eq("provider_transaction_id", sessionId);

        if (updateError) {
          console.error("[stripe-webhook] Failed to update transaction status:", updateError);
        }
      } else if (eventType === "checkout.session.expired" || eventType === "payment_intent.canceled") {
        console.info(`[stripe-webhook] Marking session cancelled/expired: ${sessionId}`);
        await supabase
          .from("support_transactions")
          .update({ status: "cancelled" })
          .eq("provider_transaction_id", sessionId);
      } else if (eventType === "payment_intent.payment_failed") {
        console.info(`[stripe-webhook] Marking payment failed: ${sessionId}`);
        await supabase
          .from("support_transactions")
          .update({ status: "failed" })
          .eq("provider_transaction_id", sessionId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[stripe-webhook] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
