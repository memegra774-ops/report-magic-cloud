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

    const { email, password, role, full_name, department_id } = await req.json();

    console.log(`Creating user: ${email} with role: ${role}`);

    // Create user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    console.log(`User created with ID: ${authData.user.id}`);

    // Update profile with department and set password_change_required flag
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        department_id: department_id || null,
        full_name: full_name || null,
        password_change_required: true, // New users must change password
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile error:", profileError);
      // Profile might not exist yet due to trigger timing
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: role,
      });

    if (roleError) {
      console.error("Role error:", roleError);
      throw roleError;
    }

    console.log(`Role ${role} assigned to user ${authData.user.id}`);

    // Email will be sent from frontend using EmailJS
    // No server-side email sending needed

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        user_id: authData.user.id,
        email: email,
        full_name: full_name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
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
