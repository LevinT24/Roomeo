# 📱 Twilio WhatsApp Setup Guide for Roomio

## 🤔 Do You Need Twilio?

**Current Setup**: Your app uses `wa.me` links (FREE, works immediately)
**Twilio Setup**: Sends WhatsApp messages directly (PAID, requires approval)

| Feature | Current (wa.me) | Twilio WhatsApp |
|---------|----------------|-----------------|
| Cost | FREE | $0.005-0.09 per message |
| Setup Time | 0 minutes | 1-2 weeks (approval) |
| User Experience | Opens WhatsApp app | Direct message delivery |
| Business Verification | Not required | Required |
| Message Templates | Not required | Required pre-approval |

## 📋 Twilio Setup Steps

### Step 1: Twilio Account Setup

1. **Create Twilio Account**
   ```bash
   https://www.twilio.com/try-twilio
   ```

2. **Get Account SID and Auth Token**
   - Go to Twilio Console Dashboard
   - Copy Account SID and Auth Token

3. **Purchase Phone Number**
   - Console → Phone Numbers → Manage → Buy a number
   - Choose a WhatsApp-capable number

### Step 2: WhatsApp Business API Setup

1. **Request WhatsApp Business API Access**
   ```bash
   https://www.twilio.com/whatsapp
   ```

2. **Business Verification Requirements**
   - Business name and address
   - Website URL
   - Business description
   - Tax ID or business registration
   - Bank statement or utility bill

3. **Message Template Approval**
   - Create templates for invite messages
   - Submit for WhatsApp approval (takes 1-2 weeks)

### Step 3: Environment Variables

Add to your `.env.local`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# WhatsApp Template IDs (after approval)
TWILIO_INVITE_TEMPLATE_SID=your_template_sid_here
```

### Step 4: Install Twilio SDK

```bash
npm install twilio
```

### Step 5: Implementation Files

Create these files in your project:

#### `lib/twilio.ts`
```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppInvite(
  recipientPhone: string,
  inviteUrl: string,
  groupName: string,
  inviterName: string
) {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${recipientPhone}`,
      body: `Hi! ${inviterName} invited you to join "${groupName}" on Roomio to split expenses: ${inviteUrl}`,
    });
    
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}
```

#### `app/api/invites/twilio/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppInvite } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const { recipientPhone, inviteUrl, groupName, inviterName } = await request.json();
    
    const result = await sendWhatsAppInvite(
      recipientPhone,
      inviteUrl,
      groupName,
      inviterName
    );
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send WhatsApp message' 
    }, { status: 500 });
  }
}
```

### Step 6: Update Invite Modal

In `components/InviteModal.tsx`, add Twilio option:

```typescript
// Add this to the handleCreateInvite function
if (inviteMethod === 'whatsapp-direct') {
  try {
    const response = await fetch('/api/invites/twilio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone,
        inviteUrl: data.invite.inviteUrl,
        groupName,
        inviterName: user.name
      }),
    });
    
    const twilioResult = await response.json();
    if (twilioResult.success) {
      setSuccessMessage('WhatsApp message sent directly!');
    }
  } catch (error) {
    setError('Failed to send WhatsApp message');
  }
}
```

## 🚨 Important Considerations

### Costs
- **Setup**: Free
- **Messages**: $0.005-0.09 per message
- **Phone Number**: ~$1/month

### Approval Process
- **Business verification**: 1-2 weeks
- **Message templates**: 1-2 weeks
- **Total setup time**: 2-4 weeks

### Compliance
- Must follow WhatsApp Business Policy
- Cannot send promotional messages
- Must have user consent

## 🎯 Recommendation

**For Roomio MVP**: Stick with current `wa.me` implementation
- ✅ Works immediately
- ✅ Free
- ✅ Good user experience
- ✅ No approval needed

**For Enterprise**: Consider Twilio
- ✅ Professional messaging
- ✅ Better analytics
- ✅ No app switching required
- ❌ Complex setup
- ❌ Ongoing costs

## 🚀 Quick Test (Current wa.me)

Your current implementation is already working! Test it:

1. Go to Expenses page
2. Click "Invite" on a room
3. Select WhatsApp
4. Enter phone number: `+1234567890`
5. Click "Send WhatsApp Invite"

WhatsApp should open with the message pre-filled!

---

**Bottom Line**: Your current implementation is perfect for an MVP. Only upgrade to Twilio if you need enterprise-level features and are willing to wait 2-4 weeks for approval.