import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

type ValidateInviteResponse = {
  success: true,
  invite: {
    groupId: string,
    groupName: string,
    inviterName: string,
    status: 'pending' | 'accepted' | 'expired',
    expiresAt: string
  }
} | {
  success: false,
  error: 'TOKEN_NOT_FOUND' | 'EXPIRED' | 'ALREADY_ACCEPTED'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse<ValidateInviteResponse>> {
  try {
    const { token } = params;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_NOT_FOUND' 
      }, { status: 400 });
    }
    
    const supabase = supabaseServer();
    
    // Use our database function to validate the token
    const { data, error } = await supabase.rpc('validate_invite_token', { 
      token: token 
    });
    
    if (error) {
      console.error('Error validating invite token:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_NOT_FOUND' 
      }, { status: 404 });
    }
    
    // The function returns an array with one result
    const result = data?.[0];
    
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'TOKEN_NOT_FOUND' 
      }, { status: 404 });
    }
    
    // Check if token is valid (not expired and pending)
    if (!result.is_valid) {
      if (result.status === 'accepted') {
        return NextResponse.json({ 
          success: false, 
          error: 'ALREADY_ACCEPTED' 
        }, { status: 410 });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'EXPIRED' 
        }, { status: 410 });
      }
    }
    
    return NextResponse.json({
      success: true,
      invite: {
        groupId: result.group_id,
        groupName: result.group_name,
        inviterName: result.inviter_name,
        status: result.status,
        expiresAt: result.expires_at,
      },
    });
    
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'TOKEN_NOT_FOUND' 
    }, { status: 500 });
  }
}