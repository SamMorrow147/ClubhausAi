# Migration from Redis (Vercel KV) to Neon PostgreSQL

This document outlines the migration from Redis/Vercel KV to Neon PostgreSQL for chat log storage.

## Changes Made

### 1. Database Driver
- **Removed**: `redis` package (still in package.json but no longer used)
- **Added**: `@neondatabase/serverless` package for Neon PostgreSQL

### 2. Database Schema
- Created `database-schema.sql` with PostgreSQL table structure
- Table: `chat_logs` with columns:
  - `id` (VARCHAR, PRIMARY KEY)
  - `user_id` (VARCHAR, indexed)
  - `session_id` (VARCHAR, indexed)
  - `role` (VARCHAR, CHECK constraint for 'user' or 'assistant')
  - `content` (TEXT)
  - `metadata` (JSONB)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
  - `expires_at` (TIMESTAMP WITH TIME ZONE, for 30-day retention)

### 3. Code Changes

#### `lib/databaseLogger.ts`
- Replaced Redis client with Neon serverless driver
- Updated all methods to use SQL queries instead of Redis commands
- Changed environment variables from `KV_REST_API_URL`/`KV_REST_API_TOKEN` to `DATABASE_URL` or `POSTGRES_URL`

#### `app/api/memory/route.ts`
- Updated debug info to check for `DATABASE_URL` instead of KV variables

#### `app/api/test/route.ts`
- Updated environment variable checks to use `DATABASE_URL` instead of KV variables

#### `app/test-memory/page.tsx`
- Updated error message to reference Neon database instead of Vercel KV

## Setup Instructions

### 1. Create Database Tables

Run the SQL in `database-schema.sql` in your Neon SQL Editor:

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Execute the SQL to create the `chat_logs` table and indexes

### 2. Set Environment Variables

In your Vercel project settings, add:

- `DATABASE_URL` - Your Neon database connection string (recommended)
- OR `POSTGRES_URL` - Alternative name (also supported)

You can find these in your Neon dashboard under "Connection Details".

### 3. Remove Old Environment Variables (Optional)

You can now remove:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

These are no longer needed.

### 4. Test the Migration

1. Deploy to Vercel
2. Visit `/test-memory` to verify database connection
3. Send a test message in the chat
4. Check that logs appear in the test-memory page

## Benefits of Neon PostgreSQL

- **SQL-based queries**: More powerful querying capabilities
- **Structured data**: Better data integrity with schema
- **JSONB support**: Still supports flexible metadata storage
- **Automatic cleanup**: Can use SQL functions for data retention
- **Better for analytics**: Easier to run complex queries and reports

## Migration Notes

- Existing Redis data will not be automatically migrated
- New logs will be stored in Neon going forward
- Old Redis logs can be manually exported if needed
- The system gracefully handles missing database connections (falls back to file storage locally)

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Check that the table exists in Neon (run `SELECT * FROM chat_logs LIMIT 1;`)
3. Verify the connection string format is correct
4. Check Neon dashboard for connection limits or issues

### Query Errors

If you see SQL errors:
1. Verify the schema was created correctly
2. Check that indexes exist
3. Ensure JSONB columns are being used correctly

## Local Development

For local development, the system still uses file-based storage (`logs/chat_logs.json`). To use Neon locally:

1. Set `DATABASE_URL` in your `.env.local` file
2. The system will automatically use Neon if the environment variable is set

