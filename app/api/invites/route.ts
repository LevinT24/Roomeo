import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

interface CreateInviteRequest {
  groupId: string;
  inviteMethod: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
  customMessage?: string;
}

type CreateInviteResponse = {
  success: true,
  invite: {
    token: string,
    inviteUrl: string,
    whatsappUrl?: string,
    expiresAt: string
  }
} | {
  success: false,
  error: string
}

// Rate limiting helper (simple in-memory - could use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const limit = parseInt(process.env.INVITE_RATE_LIMIT_PER_USER_PER_DAY || '20');
  
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + dayMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function generateWhatsAppUrl(phone: string, inviteUrl: string, groupName: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const message = `Hey! Join my "${groupName}" group on Roomio so we can split expenses: ${inviteUrl}`;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

async function sendEmailInvite(email: string, inviteUrl: string, groupName: string, inviterName: string, customMessage?: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Roomio <no-reply@roomio.com>';
  
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }
  
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>You're invited to join a Roomio group</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 40px 20px;">
            <h1 style="color: #2563eb;">You're invited to Roomio!</h1>
            <p>${inviterName} invited you to join "${groupName}" to split expenses together.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; font-weight: 500;">
                    Join Group
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
                This invite expires on ${expiryDate}.
                ${customMessage ? `<br><br>Message from ${inviterName}: "${customMessage}"` : ''}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
                Roomio - Split expenses with roommates
            </p>
        </div>
    </body>
    </html>
  `;
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [email],
      subject: `You're invited to join "${groupName}" on Roomio`,
      html: htmlContent,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateInviteResponse>> {
  try {
    const body: CreateInviteRequest = await request.json();
    const { groupId, inviteMethod, recipientEmail, recipientPhone, customMessage } = body;
    
    // Validate request
    if (!groupId || !inviteMethod) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    if (inviteMethod === 'email' && !recipientEmail) {
      return NextResponse.json({ success: false, error: 'Email required for email invites' }, { status: 400 });
    }
    
    if (inviteMethod === 'whatsapp' && !recipientPhone) {
      return NextResponse.json({ success: false, error: 'Phone required for WhatsApp invites' }, { status: 400 });
    }
    
    // Use the supabaseServer helper - this should handle authentication properly
    const supabase = supabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error in invite API:', authError);
      return NextResponse.json({ 
        success: false, 
        error: `Authentication error: ${authError.message}` 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found in invite API');
      return NextResponse.json({ 
        success: false, 
        error: 'User not authenticated. Please sign in again.' 
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Verify user is member of the group
    const { data: participation, error: participationError } = await supabase
      .from('expense_participants')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (participationError || !participation) {
      console.error('Participation check failed:', participationError);
      return NextResponse.json({ success: false, error: 'Not authorized to invite to this group' }, { status: 403 });
    }
    
    console.log('✅ User is participant in group');
    
    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('expense_groups')
      .select('name')
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) {
      console.error('Group fetch failed:', groupError);
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    
    // Get inviter details
    const { data: inviter, error: inviterError } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single();
    
    if (inviterError || !inviter) {
      console.error('Inviter fetch failed:', inviterError);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    // Generate secure token
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
    
    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        invite_token: token,
        group_id: groupId,
        inviter_id: user.id,
        invited_email: recipientEmail || null,
        invited_phone: recipientPhone || null,
        custom_message: customMessage || null,
      })
      .select('expires_at')
      .single();
    
    if (inviteError) {
      console.error('Failed to create invite:', inviteError);
      return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 });
    }
    
    console.log('✅ Invite created successfully');
    
    // Generate URLs
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite?t=${token}`;
    
    const inviterName = inviter.display_name || inviter.email;
    
    // Send email if method is email
    if (inviteMethod === 'email' && recipientEmail) {
      try {
        await sendEmailInvite(recipientEmail, inviteUrl, group.name, inviterName, customMessage);
        console.log('✅ Email sent successfully');
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the whole request if email fails - user can still copy link
      }
    }
    
    // Generate WhatsApp URL if method is whatsapp
    const whatsappUrl = inviteMethod === 'whatsapp' && recipientPhone 
      ? generateWhatsAppUrl(recipientPhone, inviteUrl, group.name)
      : undefined;
    
    console.log('✅ Invite process completed successfully');
    
    return NextResponse.json({
      success: true,
      invite: {
        token,
        inviteUrl,
        whatsappUrl,
        expiresAt: invite.expires_at,
      },
    });
    
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}