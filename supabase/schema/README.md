# Event System Database Schema

This directory contains SQL schema files for the Event feature that allows grouping multiple Rooms (expense groups) together for big trips or shared activities.

## Execution Order

**IMPORTANT**: These scripts must be executed in order as each depends on the previous one.

### 1. `01_add_event_system.sql`
**Primary migration** - Creates the core Event tables and relationships.

**What it does:**
- Creates `events` table for storing event details
- Creates `event_members` table for event membership with roles
- Adds `event_id` column to existing `expense_groups` table (nullable, safe)
- Sets up RLS policies for security
- Creates necessary indexes for performance

**Safety guarantees:**
- ✅ All existing expense groups remain unchanged (event_id = NULL)
- ✅ Zero breaking changes to existing functionality
- ✅ Additive-only changes

### 2. `02_event_management_functions.sql`
**Event CRUD functions** - Core functions for managing events.

**Functions included:**
- `create_event()` - Create new events with invited members
- `get_event_details()` - Get complete event info with members and rooms
- `get_user_events()` - Get all events for a user
- `add_event_member()` - Add members to events
- `remove_event_member()` - Remove members from events
- `update_event()` - Update event details

### 3. `03_event_member_inheritance.sql`
**Member inheritance system** - Automatically manages member relationships.

**Features:**
- Auto-adds event members to new rooms created in that event
- Auto-adds new event members to existing rooms in that event
- Safely removes members from rooms when removed from event
- Manual override functions for per-room member management
- Enhanced expense group creation with event support

**Functions included:**
- `handle_event_member_inheritance()` - Trigger function for auto-inheritance
- `handle_event_room_creation()` - Trigger for new rooms in events
- `override_room_membership()` - Manual member management per room
- `create_expense_group_with_event()` - Enhanced room creation

## How to Execute

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste each file's contents **in order**
4. Click "Run" for each script
5. Verify success messages appear

### Option 2: Supabase CLI (Local Development)
```bash
# If using local development
cd my-newv
supabase db reset  # Optional: reset local DB
supabase migration new add_event_system
# Copy 01_add_event_system.sql content to the new migration file
supabase db push

# Repeat for other functions as needed
```

### Option 3: Manual Migration Files
```bash
# Create proper migration files
cd my-newv/supabase/migrations
# Copy each schema file to a new migration with timestamp
cp ../schema/01_add_event_system.sql ./$(date +%Y%m%d%H%M%S)_add_event_system.sql
# etc.
```

## Verification

After running all scripts, you should see these tables in your database:
- `events` - Event information
- `event_members` - Event membership with roles
- `expense_groups` - Original table now with optional `event_id` column

And these functions:
- Event management functions (create, read, update, delete)
- Member inheritance functions (automatic and manual)

## Safety Features

### Backward Compatibility
- All existing expense groups continue working unchanged
- Current ExpensesPage.tsx functionality preserved
- No breaking changes to existing APIs
- All current room creation flows work as before

### Data Integrity
- RLS policies ensure users can only access their own events
- Cascade deletes handle cleanup automatically
- Triggers prevent data inconsistencies
- Validation prevents invalid date ranges and empty names

### Performance
- Indexes on all foreign keys and commonly queried columns
- Efficient queries using proper joins and aggregations
- Minimal impact on existing query performance

## Testing

After running the migrations, test:

1. **Existing functionality still works:**
   ```sql
   -- Should return your existing expense groups (with event_id = NULL)
   SELECT * FROM expense_groups WHERE event_id IS NULL;
   ```

2. **Event creation works:**
   ```sql
   -- Create a test event
   SELECT create_event('Test Event', 'A test event for verification');
   ```

3. **Event details retrieval:**
   ```sql
   -- Get your events
   SELECT get_user_events();
   ```

## Rollback

If needed, you can rollback by:

1. **Remove event_id column:**
   ```sql
   ALTER TABLE expense_groups DROP COLUMN IF EXISTS event_id;
   ```

2. **Drop event tables:**
   ```sql
   DROP TABLE IF EXISTS event_members CASCADE;
   DROP TABLE IF EXISTS events CASCADE;
   ```

3. **Drop functions:**
   ```sql
   DROP FUNCTION IF EXISTS create_event CASCADE;
   DROP FUNCTION IF EXISTS get_event_details CASCADE;
   -- ... etc for all functions
   ```

## Next Steps

After successful database migration:
1. Generate new TypeScript types: `supabase gen types typescript --local`
2. Update your application code to use the new event features
3. Test thoroughly in development before production deployment

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all prerequisites (existing tables, auth setup)
3. Ensure scripts are run in the correct order
4. Check RLS policies if getting permission errors