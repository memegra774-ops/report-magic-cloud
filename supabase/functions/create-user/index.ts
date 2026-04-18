import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["system_admin", "department_head", "avd", "management", "college_dean", "hr"];

const getJwtSubject = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded));

    return typeof decoded?.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
};

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const callerId = getJwtSubject(token);
    if (!callerId || !UUID_RE.test(callerId)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerRole, error: callerRoleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "system_admin")
      .maybeSingle();

    if (callerRoleError) {
      console.error("[create-user] auth error:", callerRoleError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!callerRole) {
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
