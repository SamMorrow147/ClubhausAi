# Token Usage Persistence

## Problem
Previously, token usage data was stored in-memory on Vercel deployments, which meant the data would reset every time the application was deployed or the server restarted.

## Solution
The `TokenUsageService` has been updated to use persistent database storage (Redis/Vercel KV) instead of in-memory storage on Vercel deployments.

## Changes Made

### 1. Database Integration
- Added Redis client integration using Vercel KV
- Token usage data is now stored in the database with 90-day expiration
- Fallback to file system if database is unavailable

### 2. Migration Support
- Automatic migration of existing file-based data to database on first API call
- Seamless transition from file storage to database storage

### 3. Environment Detection
- **Local Development**: Uses file system storage (`logs/token_usage.json`)
- **Vercel Production**: Uses database storage (Redis/Vercel KV)

## Environment Variables Required

For Vercel deployments, ensure these environment variables are set:
- `KV_REST_API_URL`: Vercel KV REST API URL
- `KV_REST_API_TOKEN`: Vercel KV REST API token

## API Endpoints

### Test Database Connection
```
GET /api/test
```
Returns database connection status and environment information.

### Token Usage Data
```
GET /api/tokens?action=all
```
Returns comprehensive token usage data including today's usage, history, and statistics.

## Storage Behavior

### Local Development
- Data stored in `logs/token_usage.json`
- Persists across server restarts
- No database required

### Vercel Production
- Data stored in Vercel KV (Redis)
- Persists across deployments
- Automatic cleanup after 90 days
- Fallback to file system if database unavailable

## Migration Process

When the service is first initialized on Vercel:
1. Tests database connection
2. If successful, attempts to migrate existing file data
3. Logs migration results
4. Continues with database storage

## Benefits

1. **Persistent Data**: Token usage now persists across deployments
2. **Automatic Migration**: Existing data is automatically transferred
3. **Fallback Support**: Graceful degradation if database is unavailable
4. **Cleanup**: Automatic data expiration prevents storage bloat
5. **Environment Aware**: Different storage strategies for different environments

## Monitoring

The service logs detailed information about:
- Database connection status
- Migration progress
- Storage type being used
- Token usage logging

Check the logs for messages like:
- `✅ Redis client connected for token usage`
- `📊 Migrated X records from file to database`
- `📊 Logged X tokens for model Y (Database)` 