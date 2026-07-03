// Supabase Edge Function: list-users
//
// Returns email and last sign-in time for each person who has joined the
// admin's board. The client's anon key cannot read auth.users directly,
// so this runs server-side with the service role key.
//
// Deploy with:
//   supabase functions deploy list-users

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

  const { data: people, error: peopleError } = await callerClient
    .from("people")
    .select("id, user_id")
    .eq("owner_id", caller.id)
    .not("user_id", "is", null);

  if (peopleError) {
    return new Response(JSON.stringify({ error: peopleError.message }), { status: 500, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const results = [];
  for (const p of people || []) {
    const { data } = await adminClient.auth.admin.getUserById(p.user_id);
    if (data?.user) {
      results.push({
        personId: p.id,
        email: data.user.email,
        lastSignInAt: data.user.last_sign_in_at,
        createdAt: data.user.created_at,
        hasPassword: !!data.user.app_metadata?.provider && data.user.identities?.some(i => i.provider === "email"),
      });
    }
  }

  return new Response(JSON.stringify({ users: results }), { status: 200, headers: corsHeaders });
});
