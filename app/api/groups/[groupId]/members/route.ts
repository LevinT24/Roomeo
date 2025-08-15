import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

interface MemberRecord {
  joined_at: string;
  users: {
    id: string;
    display_name: string | null;
    email: string;
  };
}

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
    
    // Get all group members with their user details
    const { data: members, error: membersError } = await supabase
      .from('expense_participants')
      .select(`
        users!inner(
          id,
          display_name,
          email
        ),
        joined_at
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
    }
    
    // Format the response
    const formattedMembers = members.map((member: MemberRecord) => ({
      id: member.users.id,
      display_name: member.users.display_name,
      email: member.users.email,
      joined_at: member.joined_at,
    }));
    
    return NextResponse.json({
      success: true,
      members: formattedMembers,
    });
    
  } catch (error) {
    console.error('Error in members API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}