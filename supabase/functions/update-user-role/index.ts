import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    const { user_id, new_role, department_id } = await req.json();

    if (!user_id || !new_role) {
      throw new Error("user_id and new_role are required");
    }

    console.log(`Updating user ${user_id} to role: ${new_role}`);

    // Update or insert role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: new_role })
        .eq("user_id", user_id);

      if (roleError) {
        console.error("Role update error:", roleError);
        throw roleError;
      }
    } else {
      // Insert new role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role: new_role });

      if (roleError) {
        console.error("Role insert error:", roleError);
        throw roleError;
      }
    }

    // Update department if provided
    if (department_id !== undefined) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ department_id: department_id || null })
        .eq("id", user_id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    console.log(`User ${user_id} role updated to ${new_role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User role updated successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details || null 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
