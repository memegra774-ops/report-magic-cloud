import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["system_admin", "department_head", "avd", "management", "college_dean", "hr"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- AUTHENTICATE caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      console.error("[create-user] auth error:", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- AUTHORIZE: must be system_admin ---
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "system_admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: system_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- VALIDATE input ---
    const body = await req.json();
    const { email, password, role, full_name, department_id, college_id } = body ?? {};

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!password || typeof password !== "string" || password.length < 8 || password.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!role || !ALLOWED_ROLES.includes(role)) {
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
    if (full_name && (typeof full_name !== "string" || full_name.length > 200)) {
      return new Response(JSON.stringify({ error: "Invalid full_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-user] caller=${callerId} creating ${email} role=${role}`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        department_id: department_id || null,
        college_id: college_id || null,
        full_name: full_name || null,
        password_change_required: true,
      })
      .eq("id", authData.user.id);

    if (profileError) console.error("Profile error:", profileError);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authData.user.id, role });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        user_id: authData.user.id,
        email,
        full_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
