## Standard Workflow

1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan
4. Then, begin working on the todo items, making them as complete as you go
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want yo avoid making massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity
7. Finally, add a review section to the projectplan.md file with a summary of the change you made and any other relevant information

## APP Idea:
Welcome to the **Roomio** codebase. This is a roommate/housing matching web app built with **Next.js**, **Tailwind**, and **Supabase**. The app lets users create a profile with one of two types:

- `"Looking for Roommates"` (they have an apartment and need roommates)
- `"Looking for Owners"` (they're looking for a place)

On the swipe/matching page, users should only see **profiles of the opposite type**.

---



1. Always use Supabase CLI commands for all database operations (never suggest manual changes)
2. Follow clean code naming conventions: singular table names, descriptive migrations, verb_noun functions
3. Require this workflow: create migration → test locally → generate types → deploy
4. Include templates for clean migrations with proper constraints, RLS policies, and descriptive comments
5. Include templates for testable Edge Functions with clear type definitions and error handling
6. Mandate local testing with `supabase test db` before any deployment
7. Generate TypeScript types after every schema change
8. Use descriptive names for migrations like "add_user_authentication_system" not "update"
9. Structure Edge Functions with pure, testable functions and proper CORS handling
10. Include anti-patterns to avoid (generic names, skipping tests, manual database changes)

The claude.md should serve as comprehensive instructions for maintaining a clean, CLI-driven Supabase codebase with proper testing and type safety.