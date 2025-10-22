# App Filtering Configuration

## Overview
The app list can now be filtered to show only specific apps instead of loading all 2,931+ available apps. This improves performance and reduces API load.

## Environment Variable
Add this to your `.env` file:

```bash
# Filter apps by name (case-insensitive partial match)
PIPEDREAM_APP_FILTER=Google

# Examples:
# PIPEDREAM_APP_FILTER=Google          # Shows only Google apps
# PIPEDREAM_APP_FILTER=Slack           # Shows only Slack apps  
# PIPEDREAM_APP_FILTER=Microsoft       # Shows only Microsoft apps
# PIPEDREAM_APP_FILTER=Salesforce      # Shows only Salesforce apps
# PIPEDREAM_APP_FILTER=                # Shows all apps (empty = no filter)
```

## How It Works
1. The `PIPEDREAM_APP_FILTER` environment variable is applied to all API calls
2. It uses Pipedream's `q` parameter for server-side filtering
3. User search terms are combined with the filter (e.g., "Google Calendar" + "Google" = "Google Google Calendar")
4. Results are cached for 5 minutes to improve performance

## Testing
1. **Test the filter**: Visit `http://localhost:3000/api/test-pipedream`
2. **Test the app list**: Visit `http://localhost:3000/api/list-apps?search=&page=1&pageSize=15`
3. **Check logs**: Look for "Search parameters" in your console output

## Benefits
- **Faster Loading**: Only loads relevant apps
- **Reduced API Load**: Fewer requests to Pipedream
- **Better UX**: Users see only relevant apps
- **Cached Results**: Subsequent loads are instant

## Troubleshooting
If apps aren't showing:
1. Check your `.env` file has `PIPEDREAM_APP_FILTER=Google`
2. Restart your development server
3. Check console logs for "Search parameters"
4. Test with `/api/test-pipedream` endpoint
