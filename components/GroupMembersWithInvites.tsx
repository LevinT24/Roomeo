"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Clock, CheckCircle, XCircle, Mail, MessageCircle, UserPlus } from "lucide-react";
import InviteModal from "./InviteModal";

interface GroupMember {
  id: string;
  display_name: string;
  email: string;
  joined_at: string;
}

interface PendingInvite {
  id: string;
  invited_email?: string;
  invited_phone?: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

interface GroupMembersWithInvitesProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export default function GroupMembersWithInvites({ 
  groupId, 
  groupName, 
  isOwner 
}: GroupMembersWithInvitesProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchGroupData = async () => {
    try {
      // Fetch current members
      const membersResponse = await fetch(`/api/groups/${groupId}/members`);
      const membersData = await membersResponse.json();
      
      // Fetch pending invites
      const invitesResponse = await fetch(`/api/groups/${groupId}/invites`);
      const invitesData = await invitesResponse.json();
      
      if (membersData.success) {
        setMembers(membersData.members);
      }
      
      if (invitesData.success) {
        setPendingInvites(invitesData.invites.filter((invite: PendingInvite) => 
          invite.status === 'pending' && new Date(invite.expires_at) > new Date()
        ));
      }
      
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
    
    // Refresh data every 30 seconds to show real-time updates
    const interval = setInterval(fetchGroupData, 30000);
    return () => clearInterval(interval);
  }, [groupId]);

  const formatDisplayName = (invite: PendingInvite) => {
    if (invite.invited_email && invite.invited_phone) {
      return `${invite.invited_email} (${invite.invited_phone})`;
    }
    if (invite.invited_email) {
      return invite.invited_email;
    }
    if (invite.invited_phone) {
      return invite.invited_phone;
    }
    return 'Unknown contact';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    if (diffDays > 1) return `${diffDays} days`;
    if (diffMs > 0) return 'Less than 1 day';
    return 'Expired';
  };

  const getInviteMethod = (invite: PendingInvite) => {
    if (invite.invited_email) return 'email';
    if (invite.invited_phone) return 'whatsapp';
    return 'unknown';
  };

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    fetchGroupData(); // Refresh to show new pending invite
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Group Members</h2>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
              {members.length}
            </span>
          </div>
          
          {isOwner && (
            <Button onClick={() => setShowInviteModal(true)} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          )}
        </div>

        {/* Current Members */}
        <div className="space-y-3 mb-6">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {member.display_name || member.email}
                  </p>
                  <p className="text-sm text-green-700">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-medium text-gray-900">Invited Users</h3>
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-sm">
                {pendingInvites.length} waiting to join
              </span>
            </div>
            
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-amber-900">
                          {formatDisplayName(invite)}
                        </p>
                        {getInviteMethod(invite) === 'email' && (
                          <Mail className="w-4 h-4 text-blue-500" title="Sent via Email" />
                        )}
                        {getInviteMethod(invite) === 'whatsapp' && (
                          <MessageCircle className="w-4 h-4 text-green-500" title="Sent via WhatsApp" />
                        )}
                      </div>
                      <p className="text-sm text-amber-700">
                        Expires in {getTimeRemaining(invite.expires_at)} • 
                        Invited {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {members.length === 1 && pendingInvites.length === 0 && isOwner && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No other members yet</h3>
            <p className="text-gray-600 mb-4">Invite people to start splitting expenses together</p>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Send First Invite
            </Button>
          </div>
        )}

        {/* Summary */}
        {(members.length > 1 || pendingInvites.length > 0) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{members.length} active members</span>
              {pendingInvites.length > 0 && (
                <span>{pendingInvites.length} pending invites</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          groupId={groupId}
          groupName={groupName}
        />
      )}
    </>
  );
}