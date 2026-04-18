import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = ["system_admin", "department_head", "avd", "management", "college_dean", "hr"];

const DEFAULT_RESET_PASSWORD = "12345678";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let callerId: string;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    try {
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || typeof claimsData?.claims?.sub !== "string") {
        throw new Error("Missing token subject");
      }

      callerId = claimsData.claims.sub;
      console.log(`[update-user-role] claims caller=${callerId}`);
    } catch (authError) {
      console.error("[update-user-role] claims auth error:", authError);
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

    const body = await req.json();
    const { user_id, new_role, department_id, college_id, full_name, reset_password } = body ?? {};

    if (!user_id || typeof user_id !== "string" || !UUID_RE.test(user_id)) {
      return new Response(JSON.stringify({ error: "Invalid user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new_role !== undefined && !ALLOWED_ROLES.includes(new_role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (department_id && (typeof department_id !== "string" || !UUID_RE.test(department_id))) {
      return new Response(JSON.stringify({ error: "Invalid department_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (college_id && (typeof college_id !== "string" || !UUID_RE.test(college_id))) {
      return new Response(JSON.stringify({ error: "Invalid college_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (full_name !== undefined && (typeof full_name !== "string" || full_name.length > 200)) {
      return new Response(JSON.stringify({ error: "Invalid full_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_role) {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles").select("id").eq("user_id", user_id).maybeSingle();
      if (existingRole) {
        const { error } = await supabaseAdmin.from("user_roles").update({ role: new_role }).eq("user_id", user_id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id, role: new_role });
        if (error) throw error;
      }
    }

    const profileUpdate: Record<string, any> = {};
    if (department_id !== undefined) profileUpdate.department_id = department_id || null;
    if (college_id !== undefined) profileUpdate.college_id = college_id || null;
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user_id);
      if (error) throw error;
    }

    let tempPassword: string | undefined;
    if (reset_password) {
      tempPassword = DEFAULT_RESET_PASSWORD;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: tempPassword });
      if (error) throw error;
      await supabaseAdmin.from("profiles").update({ password_change_required: true }).eq("id", user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: reset_password ? "User updated and password reset" : "User updated successfully",
        ...(tempPassword ? { temp_password: tempPassword } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error updating user:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
