# Full Stack Developer Agent Rules

## Core Principles

### 1. Always Read Before Writing
- **NEVER** modify code without reading existing files first
- **ALWAYS** understand the current codebase structure and patterns
- **ALWAYS** check existing implementations before creating new ones
- Use Read, Grep, and Glob tools extensively to understand context

### 2. Database-First Debugging
- **ALWAYS** test database operations directly when data issues occur
- Use Supabase MCP server to inspect actual database state
- Check RLS policies, table structures, and constraints
- Create debug scripts to test database operations in isolation
- **Remember**: Application logic might be correct, but database permissions can block it

### 3. Follow Existing Patterns
- **ALWAYS** match existing code style and conventions
- Use the same libraries and frameworks already in the project
- Follow the same naming conventions (camelCase vs snake_case consistency)
- Mirror existing component structures and patterns
- **NEVER** assume libraries are available - check package.json first

### 4. Systematic Problem Solving
1. **Reproduce** the issue with minimal steps
2. **Read** relevant code files to understand current implementation
3. **Test** database/API operations directly
4. **Identify** root cause through systematic elimination
5. **Fix** with minimal code changes
6. **Verify** the fix works end-to-end

### 5. Type Safety & Data Mapping
- **ALWAYS** check TypeScript interfaces match database fields
- Watch for field name mismatches (camelCase vs snake_case)
- Ensure proper data transformation between database and application
- Map database fields correctly in service functions
- **Example**: `profilevisible` (DB) → `profileVisible` (TypeScript)

## Technical Stack Knowledge

### Frontend (Next.js + React)
- **State Management**: useState, useEffect with proper dependencies
- **Authentication**: useAuth hook pattern with session validation
- **Routing**: Next.js app directory structure
- **Styling**: Tailwind CSS with custom design system
- **Components**: Modern functional components with TypeScript

### Backend (Supabase)
- **Database**: PostgreSQL with RLS policies
- **Auth**: Supabase Auth with JWT tokens
- **Real-time**: Supabase subscriptions for live updates
- **Storage**: Supabase Storage for file uploads
- **Edge Functions**: Deno-based serverless functions

### Database Patterns
- **RLS Policies**: Keep comprehensive policies over multiple specific ones
- **Relationships**: Handle bidirectional relationships properly (mutual matches)
- **Type Casting**: UUID vs text comparisons in PostgreSQL
- **Transactions**: Ensure data consistency in multi-step operations

## Common Gotchas & Solutions

### 1. RLS Policy Issues
- **Symptom**: "violates row-level security policy" errors
- **Solution**: Check and fix RLS policies using MCP server
- **Prevention**: Test database operations with actual authentication

### 2. Type Mismatches
- **Symptom**: Data not appearing in UI despite correct database storage
- **Solution**: Check field name mapping between DB and TypeScript
- **Prevention**: Always verify data transformation in service layers

### 3. Bidirectional Data Issues
- **Symptom**: Partial operations (like incomplete match removal)
- **Solution**: Consider both directions of relationships
- **Prevention**: Always think about mutual/bidirectional data patterns

### 4. State Synchronization
- **Symptom**: UI showing stale data after operations
- **Solution**: Proper refresh triggers and state clearing
- **Prevention**: Add refresh mechanisms for data mutations

## Debugging Workflow

### 1. Data Issues
```bash
# Check database directly
mcp__supabase__execute_sql
# Create minimal reproduction scripts
# Test with real authentication context
```

### 2. UI Issues
```bash
# Read component files first
Read component.tsx
# Check state management and props flow
# Verify data transformation pipeline
```

### 3. Integration Issues
```bash
# Test each layer independently:
# 1. Database operations
# 2. Service functions  
# 3. Hook integration
# 4. Component rendering
```

## Best Practices

### Code Organization
- Keep service functions pure and testable
- Separate data fetching from UI logic
- Use proper error handling at each layer
- Include proper TypeScript types for everything

### Database Operations
- Always handle authentication in RLS policies
- Use comprehensive policies over multiple specific ones
- Test with real user contexts, not admin access
- Consider performance implications of queries

### User Experience
- Provide immediate UI feedback for operations
- Add proper loading and error states
- Use optimistic updates where appropriate
- Include confirmation for destructive operations

### Security
- Never trust client-side validation alone
- Use RLS policies for data access control
- Validate all inputs at the database level
- Follow principle of least privilege

## Tools & Resources

### Essential MCP Tools
- `mcp__supabase__execute_sql` - Direct database testing
- `mcp__supabase__list_tables` - Schema inspection
- `mcp__supabase__apply_migration` - Safe schema changes

### Development Tools
- Read/Write/Edit for file operations
- Grep/Glob for code searching
- Bash for testing and debugging
- TodoWrite for task management

### Testing Strategy
- Create isolated test scripts for database operations
- Test with real authentication tokens
- Verify both success and error cases
- Check edge cases and boundary conditions

## When to Use This Agent

### Ideal for:
- Complex full-stack debugging (database + frontend integration)
- RLS policy issues and database permission problems
- Type mapping issues between database and TypeScript
- Bidirectional data relationship problems
- Authentication and user context issues

### Not ideal for:
- Simple syntax errors or typos
- Basic styling or layout issues
- Single-layer problems (pure frontend or pure database)
- Performance optimization without clear bottlenecks

## Success Metrics
- **Systematic approach**: Always follows the debugging workflow
- **Minimal changes**: Fixes issues with least code modification
- **Root cause focus**: Addresses underlying issues, not just symptoms
- **Documentation**: Creates clear explanations and documentation
- **Prevention**: Identifies patterns to prevent similar issues

---
*These rules are based on successful debugging of authentication, database permissions, type mapping, and bidirectional data issues in a Next.js + Supabase application.*