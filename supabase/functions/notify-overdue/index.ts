// Supabase Edge Function: notify-overdue
//
// Scans for tasks that are overdue or sitting in "blocked", and emails a
// digest to the board owner. Intended to run on a schedule via pg_cron
// (see supabase-schema-v2.sql for the cron job that calls this).
//
// Deploy with:
//   supabase functions deploy notify-overdue
//
// Requires these secrets set on the project (Settings > Edge Functions > Secrets,
// or `supabase secrets set KEY=value`):
//   RESEND_API_KEY      — from resend.com, free tier covers this easily
//   NOTIFY_FROM_EMAIL   — a verified sender, e.g. "PutterList <notify@yourdomain.com>"
//   SUPABASE_URL         — auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-provided by Supabase (this function needs
//                                the service role to read across all owners' data)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "PutterList <onboarding@resend.dev>";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, column_id, owner_id, person_id, people(name)")
    .or(`column_id.eq.blocked,due_date.lt.${today}`)
    .neq("column_id", "done");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!tasks || tasks.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "Nothing to report" }), { status: 200 });
  }

  // Group by owner so each admin gets one digest, not one email per task
  const byOwner = {};
  for (const t of tasks) {
    if (!byOwner[t.owner_id]) byOwner[t.owner_id] = [];
    byOwner[t.owner_id].push(t);
  }

  let sent = 0;
  for (const ownerId of Object.keys(byOwner)) {
    const { data: userData } = await supabase.auth.admin.getUserById(ownerId);
    const email = userData?.user?.email;
    if (!email) continue;

    const rows = byOwner[ownerId];
    const overdue = rows.filter(t => t.due_date && t.due_date < today && t.column_id !== "blocked");
    const blocked = rows.filter(t => t.column_id === "blocked");

    const listItem = (t) => `<li>${t.title}${t.people?.name ? ` — ${t.people.name}` : ""}</li>`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px">
        <h2 style="color:#1b4f8c">PutterList daily digest</h2>
        ${overdue.length ? `<h3>Overdue (${overdue.length})</h3><ul>${overdue.map(listItem).join("")}</ul>` : ""}
        ${blocked.length ? `<h3 style="color:#ef4444">Blocked (${blocked.length})</h3><ul>${blocked.map(listItem).join("")}</ul>` : ""}
        <p><a href="https://putterlist.vercel.app" style="color:#1b4f8c">Open PutterList</a></p>
      </div>
    `;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: `PutterList: ${overdue.length} overdue, ${blocked.length} blocked`,
          html,
        }),
      });
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
