# Project Plan: Fix Profile Setup and SwipePage Data Issues

## Problem Analysis
1. **Profile setup data not saving**: User completes profile setup but gets redirected back to profile setup on refresh
2. **Session persistence issues**: Sessions not being stored properly in browser storage
3. **Database field naming mismatch**: Variable names in SwipePage may not match actual Supabase table column names
4. **User data not persisting**: Profile completion status not being recognized

## Root Causes Identified
- Custom storage was disabled, causing session loss
- Field name mismatches between frontend and database schema
- Profile data not being saved to Supabase properly
- Session validation failing after page refresh

## Step-by-Step Plan

### Step 1: Check Database Schema vs SwipePage Variables ✅
- [x] Compare SwipePage query field names with actual Supabase table schema
- [x] Identify any naming mismatches (e.g., `profilePicture` vs `profilepicture`)
- [x] Document exact field mappings needed

### Step 2: Fix Field Name Mismatches 
- [ ] Update SwipePage query to use correct database column names
- [ ] Fix any case sensitivity issues
- [ ] Test the updated query

### Step 3: Debug Profile Setup Data Saving
- [ ] Check if ProfileSetup.tsx is actually calling updateUserProfile correctly
- [ ] Verify updateUserProfile service is working
- [ ] Add logging to track where profile saving fails

### Step 4: Fix Session Persistence
- [ ] Test custom storage implementation
- [ ] Debug session storage/retrieval issues
- [ ] Ensure sessions persist across page refreshes

### Step 5: Test Complete Flow
- [ ] Test signup → profile setup → save → refresh → should stay logged in
- [ ] Test swipe page loads correctly with saved user data
- [ ] Verify user type filtering works correctly

### Step 6: Cleanup and Documentation
- [ ] Remove debug logging
- [ ] Add any necessary error handling
- [ ] Update documentation

## Key Files to Modify
- `components/SwipePage.tsx` - Fix field name mappings
- `components/ProfileSetup.tsx` - Verify data saving
- `services/supabase.ts` - Check updateUserProfile function
- `lib/supabase.ts` - Fix session persistence
- `hooks/useAuth.ts` - Verify user data loading

## Testing Strategy
- Manual testing of complete signup flow
- Check browser localStorage/sessionStorage
- Verify database entries are created
- Test page refresh maintains session

## Success Criteria
- User completes profile setup and data is saved to Supabase
- Page refresh maintains logged-in state
- SwipePage loads user data correctly
- User type filtering works on swipe page