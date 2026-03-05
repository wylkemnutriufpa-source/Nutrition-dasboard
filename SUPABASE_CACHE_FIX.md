# Supabase PostgREST Schema Cache Issue

## Problem
The Supabase PostgREST API is not recognizing the `anamnesis_snapshot` column in the `meal_plan_drafts` table due to a stale schema cache.

## Error Message
```
Could not find the 'anamnesis_snapshot' column of 'meal_plan_drafts' in the schema cache
```

## Solution Options

### Option 1: Force Schema Reload (Fastest)
Execute this SQL in Supabase SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

### Option 2: Restart Supabase Project
1. Go to Supabase Dashboard
2. Settings → General
3. Click "Restart project"
4. Wait 1-2 minutes for restart to complete

### Option 3: Wait for Auto-Reload
PostgREST automatically reloads the schema cache every 10 minutes.
You can wait, but Option 1 or 2 is faster.

## After Fixing
Run the E2E test again:
```bash
curl -X POST "$API_URL/api/admin/automation-engine/run"
```

The `create_pre_plan_draft` action should then work correctly.

## References
- https://postgrest.org/en/stable/references/schema_cache.html
- https://github.com/PostgREST/postgrest/issues/2622
