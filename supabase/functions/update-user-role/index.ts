import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { user_id, new_role, department_id, full_name, reset_password } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Update role if provided
    if (new_role) {
      console.log(`Updating user ${user_id} to role: ${new_role}`);
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: new_role })
          .eq("user_id", user_id);
        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id, role: new_role });
        if (roleError) throw roleError;
      }
    }

    // Update profile fields (department, name)
    const profileUpdate: Record<string, any> = {};
    if (department_id !== undefined) {
      profileUpdate.department_id = department_id || null;
    }
    if (full_name !== undefined) {
      profileUpdate.full_name = full_name;
    }
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user_id);
      if (profileError) {
        console.error("Profile update error:", profileError);
        throw profileError;
      }
    }

    // Reset password if requested
    if (reset_password) {
      console.log(`Resetting password for user ${user_id}`);
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: "12345678",
      });
      if (passwordError) {
        console.error("Password reset error:", passwordError);
        throw passwordError;
      }
      // Set password_change_required flag
      await supabaseAdmin
        .from("profiles")
        .update({ password_change_required: true })
        .eq("id", user_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: reset_password ? "User updated and password reset to default" : "User updated successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error updating user:", error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.details || null }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
