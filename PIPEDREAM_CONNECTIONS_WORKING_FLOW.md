# Pipedream Connections - Working Flow Documentation

## ✅ **WORKING IMPLEMENTATION STATUS**

**Date**: October 22, 2024  
**Status**: OAuth Token Flow Working, Connect Token Flow Needs Server Restart

---

## **🔧 WORKING COMPONENTS**

### **1. PowerShell Script (`get-oauth-token.ps1`)**
- ✅ **FULLY WORKING** - Generates both OAuth and Connect tokens
- ✅ **Tested and verified** - Successfully calls Pipedream APIs
- ✅ **Uses correct project ID**: `proj_mJsAlN1`
- ✅ **Uses correct environment**: `development`

**Flow:**
```
1. Read credentials from .env.local
2. Get OAuth token from Pipedream OAuth API
3. Use OAuth token to get Connect token from Pipedream Connect API
4. Return both tokens
```

**Usage:**
```powershell
.\get-oauth-token.ps1
```

**Output:**
- OAuth Token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9...`
- Connect Token: `ctok_4b4dce0a16ad4972577086e3fd806360`
- Connect Link URL: `https://pipedream.com/_static/connect.html?token=...`

---

### **2. OAuth Token API Endpoint (`/api/oauth-token`)**
- ✅ **FULLY WORKING** - Uses PowerShell approach
- ✅ **Returns OAuth tokens** successfully
- ✅ **Uses environment variables** from `.env.local`

**Request:**
```bash
POST /api/oauth-token
Content-Type: application/json
Body: {"scope": "*"}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "*"
}
```

---

### **3. Connect Token API Endpoint (`/api/connect-token`)**
- ⚠️ **NEEDS SERVER RESTART** - Updated to use PowerShell approach
- ✅ **Code updated** - Should work after restart
- ✅ **Uses correct project ID**: `proj_mJsAlN1`

**Request:**
```bash
POST /api/connect-token
Authorization: Bearer <oauth_token>
Content-Type: application/json
Body: {"external_user_id": "612f545d-356b-466b-bf2a-1e85a40d494a"}
```

**Expected Response:**
```json
{
  "token": "ctok_4b4dce0a16ad4972577086e3fd806360",
  "expires_at": "2025-10-22T08:30:45.172+00:00",
  "connect_link_url": "https://pipedream.com/_static/connect.html?token=..."
}
```

---

### **4. Frontend Implementation**
- ✅ **UI Components** - ConnectAccountDemo component created
- ✅ **Token Callback** - Updated to use OAuth → Connect token flow
- ✅ **SDK Integration** - PipedreamClient with tokenCallback

**Location**: `components/sidebar-connections.tsx` (lines 57-83)

**Flow:**
```typescript
tokenCallback: async () => {
  // 1. Get OAuth token
  const oauthRes = await fetch("/api/oauth-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "*" }),
  });
  const { access_token } = await oauthRes.json();

  // 2. Get Connect token using OAuth token
  const connectRes = await fetch("/api/connect-token", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`
    },
    body: JSON.stringify({ external_user_id: userId }),
  });
  const { token } = await connectRes.json();
  return token;
}
```

---

## **🔑 CREDENTIALS & CONFIGURATION**

### **Environment Variables (`.env.local`)**
```bash
# Pipedream API credentials
PIPEDREAM_CLIENT_ID=r2f-cEIWgfaIMT_5zagdwdQokWRZaTbK-Mwbe-sut98
PIPEDREAM_CLIENT_SECRET=5EkhbgyUSRDJEQoW7svydUtiSBUTGFKrvJqdY2mcAmw
PIPEDREAM_PROJECT_ID=proj_Bgsln9yuf
PIPEDREAM_PROJECT_ENVIRONMENT=development

# Test User ID
TEST_USER_ID=612f545d-356b-466b-bf2a-1e85a40d494a
```

### **Working Project ID**
- **OAuth API**: Uses credentials from `.env.local`
- **Connect API**: Uses `proj_mJsAlN1` (hardcoded in endpoints)

---

## **🌐 API ENDPOINTS**

### **OAuth Token Endpoint**
- **URL**: `https://api.pipedream.com/v1/oauth/token`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "grant_type": "client_credentials",
    "client_id": "r2f-cEIWgfaIMT_5zagdwdQokWRZaTbK-Mwbe-sut98",
    "client_secret": "5EkhbgyUSRDJEQoW7svydUtiSBUTGFKrvJqdY2mcAmw",
    "scope": "*"
  }
  ```

### **Connect Token Endpoint**
- **URL**: `https://api.pipedream.com/v1/connect/proj_mJsAlN1/tokens`
- **Method**: POST
- **Headers**: 
  - `Authorization: Bearer <oauth_token>`
  - `Content-Type: application/json`
  - `x-pd-environment: development`
- **Body**:
  ```json
  {
    "external_user_id": "612f545d-356b-466b-bf2a-1e85a40d494a",
    "allowed_origins": ["http://localhost:3000"]
  }
  ```

---

## **🚀 USAGE INSTRUCTIONS**

### **1. PowerShell Script (Fully Working)**
```powershell
# Run the complete flow
.\get-oauth-token.ps1

# Expected output:
# ✅ OAuth Token Retrieved Successfully!
# ✅ Connect Token Retrieved Successfully!
# Connect Link URL: https://pipedream.com/_static/connect.html?token=...
```

### **2. API Endpoints (OAuth Working, Connect Needs Restart)**
```bash
# Test OAuth endpoint
curl -X POST http://localhost:3000/api/oauth-token \
  -H "Content-Type: application/json" \
  -d '{"scope": "*"}'

# Test Connect endpoint (after server restart)
curl -X POST http://localhost:3000/api/connect-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <oauth_token>" \
  -d '{"external_user_id": "612f545d-356b-466b-bf2a-1e85a40d494a"}'
```

### **3. Frontend UI (After Server Restart)**
1. Visit `http://localhost:3000/accounts`
2. Click "Connect Google Sheets Account" button
3. Should see OAuth → Connect token flow in network tab
4. Pipedream iframe should open for authentication

---

## **🔧 TECHNICAL IMPLEMENTATION**

### **PowerShell Approach**
Both API endpoints use PowerShell `Invoke-RestMethod` instead of Node.js `fetch` due to network connectivity issues:

```typescript
// OAuth endpoint uses PowerShell
const psCommand = `$body = @{ grant_type = 'client_credentials'; client_id = '${clientId}'; client_secret = '${clientSecret}'; scope = '${body.scope || '*'}'; } | ConvertTo-Json; Invoke-RestMethod -Uri 'https://api.pipedream.com/v1/oauth/token' -Method POST -ContentType 'application/json' -Body $body | ConvertTo-Json`;

// Connect endpoint uses PowerShell
const psCommand = `$headers = @{ 'Authorization' = 'Bearer ${accessToken}'; 'Content-Type' = 'application/json'; 'x-pd-environment' = '${environment}' }; $body = '${connectBody}'; Invoke-RestMethod -Uri 'https://api.pipedream.com/v1/connect/${projectId}/tokens' -Method POST -Headers $headers -Body $body | ConvertTo-Json`;
```

### **Error Handling**
- OAuth endpoint: ✅ Working with proper error handling
- Connect endpoint: ⚠️ Needs server restart to pick up PowerShell approach

---

## **📋 NEXT STEPS**

1. **Restart Next.js server** to pick up Connect token endpoint changes
2. **Test UI flow** - should see both OAuth and Connect token calls
3. **Verify Connect account functionality** works end-to-end
4. **Test with different apps** (Google Sheets, etc.)

---

## **🔒 LOCKED FILES**

- `get-oauth-token.ps1` - **DO NOT EDIT** - Fully working PowerShell script
- `app/api/oauth-token/route.ts` - **DO NOT EDIT** - Working OAuth endpoint
- `app/api/connect-token/route.ts` - **DO NOT EDIT** - Updated Connect endpoint

---

## **📞 SUPPORT**

If issues arise:
1. Check server logs for PowerShell command errors
2. Verify OAuth token is not expired
3. Ensure project ID `proj_mJsAlN1` is correct
4. Test PowerShell script independently first

**Last Updated**: October 22, 2024  
**Status**: OAuth Working ✅ | Connect Token Ready for Testing ⚠️
