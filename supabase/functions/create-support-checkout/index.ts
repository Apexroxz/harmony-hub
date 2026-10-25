import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLATFORMS = new Set(["macos", "windows", "linux", "android", "ios", "web"]);
const DESKTOP_WEB_PLATFORMS = new Set(["macos", "windows", "linux", "web"]);
const ALLOWED_CURRENCIES = new Set(["usd", "eur", "gbp", "cad", "aud", "jpy", "inr", "chf"]);
const MIN_AMOUNT = 0.50; // Minimum feasible charge on most card processors
const MAX_AMOUNT = 10000.00; // Sensible ceiling for voluntary contributions

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Only POST is accepted." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON request body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { amount, currency, platform, app_version } = body || {};

    // ── 1. Validate Amount ──
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount. Must be a valid positive number." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const numericAmount = Math.round(amount * 100) / 100;

    if (numericAmount < MIN_AMOUNT) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Contribution amount must be at least $${MIN_AMOUNT.toFixed(2)}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (numericAmount > MAX_AMOUNT) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Contribution amount cannot exceed $${MAX_AMOUNT.toLocaleString()}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2. Validate Currency ──
    const targetCurrency = typeof currency === "string" ? currency.toLowerCase().trim() : "usd";
    if (!ALLOWED_CURRENCIES.has(targetCurrency)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported currency '${targetCurrency}'. Allowed currencies: ${Array.from(ALLOWED_CURRENCIES).join(", ")}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Validate Platform ──
    const targetPlatform = typeof platform === "string" ? platform.toLowerCase().trim() : "web";
    if (!ALLOWED_PLATFORMS.has(targetPlatform)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid platform '${targetPlatform}'.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Platform Safety: Prevent Stripe checkout on iOS / Android
    if (!DESKTOP_WEB_PLATFORMS.has(targetPlatform)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Stripe checkout is only supported on Web and Desktop platforms. ${targetPlatform} requires native in-app contribution mechanisms.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sanitizedAppVersion =
      typeof app_version === "string" && app_version.trim().length > 0
        ? app_version.trim().slice(0, 50)
        : "1.0.0-offline";

    // ── 4. Supabase Client Initialization ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[create-support-checkout] Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Backend service configuration error." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 5. Stripe Session Creation ──
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let checkoutUrl = "";
    let providerTransactionId = "";

    const origin = req.headers.get("origin") || "https://layam.audio";
    const successUrl = `${origin}/?support=success`;
    const cancelUrl = `${origin}/?support=cancelled`;

    if (stripeKey) {
      // Real Stripe Checkout Session via Stripe API
      const stripeParams = new URLSearchParams();
      stripeParams.append("payment_method_types[]", "card");
      stripeParams.append("mode", "payment");
      stripeParams.append("success_url", successUrl);
      stripeParams.append("cancel_url", cancelUrl);
      stripeParams.append(
        "line_items[0][price_data][currency]",
        targetCurrency,
      );
      stripeParams.append(
        "line_items[0][price_data][product_data][name]",
        "Layam Hi-Fi Player — Voluntary Developer Support",
      );
      stripeParams.append(
        "line_items[0][price_data][product_data][description]",
        "Voluntary contribution to support open audiophile DSP research and local software development.",
      );
      stripeParams.append(
        "line_items[0][price_data][unit_amount]",
        String(Math.round(numericAmount * 100)),
      );
      stripeParams.append("line_items[0][quantity]", "1");

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeParams.toString(),
      });

      const stripeData = await stripeResponse.json();

      if (!stripeResponse.ok || !stripeData.url) {
        console.error("[create-support-checkout] Stripe API error:", stripeData);
        return new Response(
          JSON.stringify({
            success: false,
            error: stripeData.error?.message || "Failed to initialize payment gateway.",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      checkoutUrl = stripeData.url;
      providerTransactionId = stripeData.id;
    } else {
      // Test / Development Mode fallback when no live Stripe secret key is set
      providerTransactionId = `test_sess_${crypto.randomUUID().replace(/-/g, "")}`;
      checkoutUrl = `https://checkout.stripe.com/c/pay/${providerTransactionId}#test_mode`;
    }

    // ── 6. Record Pending Transaction in Database ──
    const { error: insertError } = await supabase.from("support_transactions").insert({
      provider: "stripe",
      provider_transaction_id: providerTransactionId,
      amount: numericAmount,
      currency: targetCurrency,
      status: "pending",
      platform: targetPlatform,
      app_version: sanitizedAppVersion,
    });

    if (insertError) {
      console.error("[create-support-checkout] Database insert error:", insertError);
      // Even if logging the pending record fails, we return the checkout session
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        provider_transaction_id: providerTransactionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[create-support-checkout] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
