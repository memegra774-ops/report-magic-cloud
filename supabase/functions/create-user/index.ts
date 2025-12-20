import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
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

    // Update profile with department if provided
    if (department_id || full_name) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          department_id: department_id || null,
          full_name: full_name || null,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile error:", profileError);
        // Profile might not exist yet due to trigger timing
      }
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

    // Send email notification with login credentials
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const roleDisplayNames: Record<string, string> = {
          'system_admin': 'System Administrator',
          'department_head': 'Department Head',
          'avd': 'Associate Vice Dean',
          'management': 'Management'
        };

        const emailResponse = await resend.emails.send({
          from: "ASTU Staff Report System <onboarding@resend.dev>",
          to: [email],
          subject: "Your Account Has Been Created - ASTU Staff Report System",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; background: #f9fafb; }
                .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                .credentials p { margin: 10px 0; }
                .credentials strong { color: #1e40af; }
                .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>ASTU Staff Report System</h1>
                  <p>College of Electrical Engineering & Computing</p>
                </div>
                <div class="content">
                  <p>Dear ${full_name || 'User'},</p>
                  <p>Your account has been created for the ASTU Staff Monthly Report System. Please find your login credentials below:</p>
                  
                  <div class="credentials">
                    <p><strong>Email/Username:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Role:</strong> ${roleDisplayNames[role] || role}</p>
                  </div>
                  
                  <div class="warning">
                    <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
                  </div>
                  
                  <p>If you have any questions, please contact the system administrator.</p>
                  
                  <p>Best regards,<br>ASTU Staff Report System</p>
                </div>
                <div class="footer">
                  <p>Adama Science and Technology University</p>
                  <p>College of Electrical Engineering & Computing</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Email error (non-fatal):", emailError);
        // Don't throw - email failure shouldn't fail user creation
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        user_id: authData.user.id,
        email_sent: !!resendApiKey
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
