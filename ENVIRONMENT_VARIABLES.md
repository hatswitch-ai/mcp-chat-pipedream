# Environment Variables

This document describes the environment variables used to control the behavior of the MCP Chat Pipedream application.

## PIPEDREAM_ALLOW_ALL_APPS

Controls whether users can search and access all Pipedream apps or only a filtered subset.

### Values

- `true`: **Full Access Mode** - Users can search and access all available Pipedream apps
  - Search makes API calls to Pipedream
  - Pagination is enabled with "Load more" button
  - Users can discover and connect to any app in the Pipedream catalog

- `false`: **Restricted Mode** - Users can only access apps matching the `PIPEDREAM_APP_FILTER`
  - Search filters locally from pre-fetched apps
  - No pagination - "Load more" button is disabled
  - Only apps matching the environment filter are available

### Default Behavior

If not set, defaults to `false` (Restricted Mode).

### Example Configuration

```bash
# Full access to all apps
PIPEDREAM_ALLOW_ALL_APPS=true

# Restricted to Google apps only
PIPEDREAM_ALLOW_ALL_APPS=false
PIPEDREAM_APP_FILTER=Google
```

## PIPEDREAM_APP_FILTER

When `PIPEDREAM_ALLOW_ALL_APPS=false`, this variable controls which apps are available to users.

### Usage

- Only used when `PIPEDREAM_ALLOW_ALL_APPS=false`
- Applied as a search filter to the Pipedream API
- Users can only see and connect to apps matching this filter
- Supports partial matching (e.g., "Google" will match "Google Sheets", "Google Drive", etc.)

### Examples

```bash
# Only Google apps
PIPEDREAM_APP_FILTER=Google

# Only Microsoft apps
PIPEDREAM_APP_FILTER=Microsoft

# Only productivity apps (if app names contain "productivity")
PIPEDREAM_APP_FILTER=productivity

# No filter (all apps, but still in restricted mode)
PIPEDREAM_APP_FILTER=
```

## Complete Example

```bash
# .env.local

# Pipedream API credentials (required)
PIPEDREAM_CLIENT_ID=your_client_id
PIPEDREAM_CLIENT_SECRET=your_client_secret
PIPEDREAM_PROJECT_ID=your_project_id
PIPEDREAM_PROJECT_ENVIRONMENT=your_environment

# Note: Frontend OAuth does not require additional environment variables

# App access control
PIPEDREAM_ALLOW_ALL_APPS=false
PIPEDREAM_APP_FILTER=Google

# Other required variables
AUTH_SECRET=your_auth_secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Disable Datadog monitoring
NEXT_PUBLIC_DATADOG_DISABLED=true
```

## NEXT_PUBLIC_DATADOG_DISABLED

Controls whether Datadog Real User Monitoring (RUM) is initialized.

### Values

- `true`: **Disable Datadog** - Datadog RUM will not be initialized
- `false` or not set: **Enable Datadog** - Datadog RUM will be initialized if credentials are provided

### Usage

This is useful for:
- Development environments where you don't want monitoring
- Testing without analytics overhead
- Compliance requirements that prohibit data collection
- Debugging issues related to Datadog

### Example Configuration

```bash
# Disable Datadog monitoring
NEXT_PUBLIC_DATADOG_DISABLED=true

# Enable Datadog monitoring (default behavior)
NEXT_PUBLIC_DATADOG_DISABLED=false
# or simply omit the variable
```

### Datadog Credentials

To enable Datadog monitoring, you also need:

```bash
NEXT_PUBLIC_DATADOG_APPLICATION_ID=your_application_id
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=your_client_token
```

## Frontend OAuth Configuration

The frontend OAuth connection flow does **not** require additional environment variables. The `createFrontendClient` function only needs the `externalUserId` from the user session.

### Usage

- No additional environment variables needed for frontend OAuth
- The `projectId` and `environment` parameters are only required for server-side Pipedream clients
- Frontend clients automatically handle the OAuth flow without project configuration

## Behavior Summary

| PIPEDREAM_ALLOW_ALL_APPS | PIPEDREAM_APP_FILTER | Behavior |
|-------------------------|---------------------|----------|
| `true` | Any value | Full access to all apps, API search, pagination enabled |
| `false` | `Google` | Only Google apps, local search, no pagination |
| `false` | `Microsoft` | Only Microsoft apps, local search, no pagination |
| `false` | (empty) | All apps but local search only, no pagination |
| Not set | Any value | Defaults to `false` behavior |

## Security Considerations

- **Restricted Mode** (`PIPEDREAM_ALLOW_ALL_APPS=false`) is recommended for production environments
- Use `PIPEDREAM_APP_FILTER` to limit users to only approved integrations
- This prevents users from connecting to unauthorized or potentially risky third-party services
- Full access mode should only be used in development or when you trust all users to make appropriate integration choices
