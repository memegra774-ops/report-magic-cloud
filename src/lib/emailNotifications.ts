import emailjs from '@emailjs/browser';
import { supabase } from '@/integrations/supabase/client';

// EmailJS configuration
const EMAILJS_PUBLIC_KEY = 'U7ON9nZCHj4tFvcvG';
const EMAILJS_SERVICE_ID = 'service_mgzytra';
const EMAILJS_TEMPLATE_ID = 'template_gwsmq1l';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Format date and time for notifications
export const formatDateTime = (date: Date = new Date()): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// Get all AVD users' emails
export const getAVDUserEmails = async (): Promise<string[]> => {
  try {
    // Get users with AVD role
    const { data: avdRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'avd');

    if (rolesError || !avdRoles?.length) {
      console.log('No AVD users found or error:', rolesError);
      return [];
    }

    // Get their emails from profiles
    const userIds = avdRoles.map(r => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .in('id', userIds);

    if (profilesError || !profiles?.length) {
      console.log('No profiles found for AVD users:', profilesError);
      return [];
    }

    return profiles.map(p => p.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching AVD users:', error);
    return [];
  }
};

// Send invitation email
export const sendInvitationEmail = async (
  name: string,
  email: string
): Promise<boolean> => {
  try {
    if (!email || !email.trim()) {
      console.error('Recipient email is empty');
      return false;
    }

    const templateParams = {
      // Common recipient field variations - EmailJS templates may use different names
      to_name: name,
      to_email: email,
      email: email,
      recipient: email,
      name: name,
      subject: 'Invitation to Join Staff Reporting Portal',
      message: `Dear ${name},

Please join the reporting portal using the following login information:

Username: ${email}
Password: 12345678

Please change your password after your first login.

Best regards,
ASTU Staff Report System`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    console.log('Invitation email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return false;
  }
};

// Send staff notification to AVD users
export const sendStaffNotificationToAVD = async (
  action: 'added' | 'deleted',
  staffName: string,
  departmentName: string,
  performedBy: string
): Promise<void> => {
  try {
    const avdEmails = await getAVDUserEmails();
    
    if (!avdEmails.length) {
      console.log('No AVD users to notify');
      return;
    }

    const dateTime = formatDateTime();
    const actionText = action === 'added' ? 'Added' : 'Deleted';
    const actionVerb = action === 'added' ? 'added to' : 'removed from';

    for (const email of avdEmails) {
      try {
        const templateParams = {
          to_name: 'AVD',
          to_email: email,
          email: email,
          recipient: email,
          name: 'AVD',
          subject: `Staff ${actionText} Notification - ${departmentName}`,
          message: `Dear AVD,

A staff member has been ${actionVerb} the system.

Staff Name: ${staffName}
Department: ${departmentName}
Action: ${actionText}
Date & Time: ${dateTime}
Performed by: ${performedBy}

Best regards,
ASTU Staff Report System`,
        };

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        console.log(`Staff notification sent to AVD: ${email}`);
      } catch (error) {
        console.error(`Failed to send notification to ${email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending AVD notifications:', error);
  }
};
