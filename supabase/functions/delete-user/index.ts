import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let callerId: string;

    try {
      const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: "authenticated",
      });

      if (typeof payload.sub !== "string") {
        throw new Error("Missing token subject");
      }

      callerId = payload.sub;
    } catch (authError) {
      console.error("[delete-user] auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "system_admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: system_admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();

    if (!user_id || typeof user_id !== "string" || !UUID_RE.test(user_id)) {
      return new Response(JSON.stringify({ error: "Invalid user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-user] caller=${callerId} deleting user=${user_id}`);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", user_id);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
