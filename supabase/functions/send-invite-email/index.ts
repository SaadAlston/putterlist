// Supabase Edge Function: send-invite-email
//
// Sends a personalized invite email through Resend when an admin invites
// someone directly from the app, instead of manually copying a link.
//
// Deploy with:
//   supabase functions deploy send-invite-email
//
// Requires this secret set on the project:
//   RESEND_API_KEY      — from resend.com
//   NOTIFY_FROM_EMAIL    — optional, a verified sender like "PutterList <notify@yourdomain.com>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "PutterList <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
  }

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
  }

  const { email, personName, link } = await req.json();
  if (!email || !link) {
    return new Response(JSON.stringify({ error: "email and link required" }), { status: 400, headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set on this project" }), { status: 500, headers: corsHeaders });
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px">
      <h2 style="color:#1b4f8c">Hi ${personName || "there"},</h2>
      <p>${caller.email} added you to PutterList.</p>
      <p>Sign in below to see your to-dos.</p>
      <p><a href="${link}" style="background:#1b4f8c;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Open PutterList</a></p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "You're invited to PutterList", html }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
});
