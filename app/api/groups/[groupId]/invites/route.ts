import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
): Promise<NextResponse> {
  try {
    const { groupId } = params;
    
    if (!groupId) {
      return NextResponse.json({ success: false, error: 'Group ID required' }, { status: 400 });
    }
    
    const supabase = supabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    
    // Verify user has access to this group
    const { data: participation, error: participationError } = await supabase
      .from('expense_participants')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (participationError || !participation) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    
    // Get all invites for this group
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select(`
        id,
        invited_email,
        invited_phone,
        status,
        expires_at,
        created_at,
        inviter_id,
        users!inviter_id(display_name, email)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    
    if (invitesError) {
      console.error('Error fetching group invites:', invitesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 });
    }
    
    // Format the response
    const formattedInvites = invites.map((invite) => ({
      id: invite.id,
      invited_email: invite.invited_email,
      invited_phone: invite.invited_phone,
      status: invite.status,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      inviter_name: invite.users?.display_name || invite.users?.email || 'Unknown',
    }));
    
    return NextResponse.json({
      success: true,
      invites: formattedInvites,
    });
    
  } catch (error) {
    console.error('Error in invites API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}