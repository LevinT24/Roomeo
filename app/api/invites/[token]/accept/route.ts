import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

interface AcceptInviteResponse {
  success: true;
  groupId: string;
  alreadyMember?: boolean;
} | {
  success: false;
  error: 'TOKEN_INVALID' | 'EXPIRED' | 'AUTH_REQUIRED' | 'ALREADY_ACCEPTED';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse<AcceptInviteResponse>> {
  try {
    const { token } = params;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_INVALID' 
      }, { status: 400 });
    }
    
    const supabase = supabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }
    
    // Use service role key for admin operations
    const adminSupabase = supabaseServer(process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // First, validate the invite token
    const { data: inviteData, error: inviteError } = await adminSupabase
      .from('invites')
      .select(`
        id,
        group_id,
        status,
        expires_at,
        accepted_by,
        expense_groups!inner(name)
      `)
      .eq('invite_token', token)
      .single();
    
    if (inviteError || !inviteData) {
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_INVALID' 
      }, { status: 404 });
    }
    
    // Check if invite is expired
    if (new Date(inviteData.expires_at) < new Date()) {
      // Mark as expired
      await adminSupabase
        .from('invites')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', inviteData.id);
        
      return NextResponse.json({ 
        success: false, 
        error: 'EXPIRED' 
      }, { status: 410 });
    }
    
    // Check if already accepted
    if (inviteData.status === 'accepted') {
      return NextResponse.json({ 
        success: false, 
        error: 'ALREADY_ACCEPTED' 
      }, { status: 410 });
    }
    
    // Check if user is already a member of this group
    const { data: existingParticipation, error: participationCheckError } = await supabase
      .from('expense_participants')
      .select('id')
      .eq('group_id', inviteData.group_id)
      .eq('user_id', user.id)
      .single();
    
    if (existingParticipation && !participationCheckError) {
      // User is already a member, mark invite as accepted and return success
      await adminSupabase
        .from('invites')
        .update({ 
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteData.id);
        
      return NextResponse.json({
        success: true,
        groupId: inviteData.group_id,
        alreadyMember: true,
      });
    }
    
    // Start a transaction to add user to group and mark invite as accepted
    const { error: transactionError } = await adminSupabase.rpc('accept_invite_transaction', {
      p_invite_id: inviteData.id,
      p_group_id: inviteData.group_id,
      p_user_id: user.id
    });
    
    // If the transaction function doesn't exist, do it manually
    if (transactionError && transactionError.message?.includes('function') && transactionError.message?.includes('does not exist')) {
      // Manual transaction: Add user to expense_participants
      const { error: participantError } = await adminSupabase
        .from('expense_participants')
        .insert({
          group_id: inviteData.group_id,
          user_id: user.id,
          amount_owed: 0,
          amount_paid: 0,
          is_settled: false,
        });
      
      if (participantError) {
        console.error('Error adding participant:', participantError);
        return NextResponse.json({ 
          success: false, 
          error: 'TOKEN_INVALID' 
        }, { status: 500 });
      }
      
      // Mark invite as accepted
      const { error: updateError } = await adminSupabase
        .from('invites')
        .update({ 
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteData.id);
      
      if (updateError) {
        console.error('Error updating invite status:', updateError);
        // User was added to group but invite wasn't marked accepted
        // This is okay - the user is in the group which is what matters
      }
    } else if (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_INVALID' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      groupId: inviteData.group_id,
    });
    
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'TOKEN_INVALID' 
    }, { status: 500 });
  }
}