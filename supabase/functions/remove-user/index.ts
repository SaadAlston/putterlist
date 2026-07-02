// Supabase Edge Function: remove-user
//
// Deletes a person's linked Supabase Auth account. Called when an admin
// removes someone who has already joined (has a user_id on their people row).
// Requires the service role key, so this runs server-side only. The client
// never touches that key.
//
// Deploy with:
//   supabase functions deploy remove-user
//
// No extra secrets needed. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided automatically by Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const { personId } = await req.json();
  if (!personId) {
    return new Response(JSON.stringify({ error: "personId required" }), { status: 400 });
  }

  // Verify the caller with their own token, scoped by RLS, to confirm
  // they actually own this person record before we touch anything.
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: person, error: lookupError } = await callerClient
    .from("people")
    .select("id, owner_id, user_id")
    .eq("id", personId)
    .single();

  if (lookupError || !person || person.owner_id !== caller.id) {
    return new Response(JSON.stringify({ error: "Not found or not yours" }), { status: 403 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  if (person.user_id) {
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(person.user_id);
    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: deleteAuthError.message }), { status: 500 });
    }
  }

  const { error: deletePersonError } = await adminClient.from("people").delete().eq("id", personId);
  if (deletePersonError) {
    return new Response(JSON.stringify({ error: deletePersonError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, authAccountRemoved: !!person.user_id }), { status: 200 });
});
