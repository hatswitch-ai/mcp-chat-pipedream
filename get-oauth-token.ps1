# PowerShell script to get OAuth token from Pipedream
# Reads credentials from .env.local file

# Function to read .env.local file
function Read-EnvFile {
    $envFile = ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    } else {
        Write-Error ".env.local file not found!"
        exit 1
    }
}

# Function to get Connect token using OAuth token
function Get-ConnectToken {
    param($oauthToken)
    
    Write-Host "`nCalling Pipedream Connect token endpoint..." -ForegroundColor Green
    
    # Get additional environment variables
    $projectId = "proj_mJsAlN1"  # Use specific project ID
    $environment = $env:PIPEDREAM_PROJECT_ENVIRONMENT
    $externalUserId = $env:TEST_USER_ID
    
    if (-not $projectId -or -not $environment -or -not $externalUserId) {
        Write-Error "Missing required environment variables: PIPEDREAM_PROJECT_ID, PIPEDREAM_PROJECT_ENVIRONMENT, or TEST_USER_ID"
        return $null
    }
    
    Write-Host "Project ID: $projectId" -ForegroundColor Yellow
    Write-Host "Environment: $environment" -ForegroundColor Yellow
    Write-Host "External User ID: $externalUserId" -ForegroundColor Yellow
    
    # Prepare Connect token request
    $connectBody = @{
        external_user_id = $externalUserId
        allowed_origins = @("http://localhost:3000")
    } | ConvertTo-Json
    
    try {
        # Call Pipedream Connect token endpoint
        $connectResponse = Invoke-RestMethod -Uri "https://api.pipedream.com/v1/connect/$projectId/tokens" -Method POST -Headers @{
            "Authorization" = "Bearer $oauthToken"
            "Content-Type" = "application/json"
            "x-pd-environment" = $environment
        } -Body $connectBody
        
        Write-Host "`n✅ Connect Token Retrieved Successfully!" -ForegroundColor Green
        Write-Host "Connect Link URL: $($connectResponse.connect_link_url)" -ForegroundColor Cyan
        Write-Host "Expires At: $($connectResponse.expires_at)" -ForegroundColor Cyan
        Write-Host "Token: $($connectResponse.token.Substring(0,50))..." -ForegroundColor Cyan
        
        # Store connect token
        $env:CONNECT_TOKEN = $connectResponse.token
        Write-Host "`nConnect token stored in `$env:CONNECT_TOKEN" -ForegroundColor Green
        
        return $connectResponse
        
    } catch {
        Write-Error "Failed to get Connect token: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Error details: $errorContent" -ForegroundColor Red
        }
        return $null
    }
}

# Read environment variables
Write-Host "Reading credentials from .env.local..." -ForegroundColor Green
Read-EnvFile

# Get credentials from environment
$clientId = $env:PIPEDREAM_CLIENT_ID
$clientSecret = $env:PIPEDREAM_CLIENT_SECRET
$scope = "*"  # Grant all permissions

# Validate credentials
if (-not $clientId -or -not $clientSecret) {
    Write-Error "Missing PIPEDREAM_CLIENT_ID or PIPEDREAM_CLIENT_SECRET in .env.local"
    exit 1
}

Write-Host "Client ID: $($clientId.Substring(0,8))..." -ForegroundColor Yellow
Write-Host "Scope: $scope" -ForegroundColor Yellow

# Prepare request body
$body = @{
    grant_type = "client_credentials"
    client_id = $clientId
    client_secret = $clientSecret
    scope = $scope
} | ConvertTo-Json

Write-Host "`nCalling Pipedream OAuth endpoint..." -ForegroundColor Green

try {
    # Call Pipedream OAuth endpoint directly
    $response = Invoke-RestMethod -Uri "https://api.pipedream.com/v1/oauth/token" -Method POST -ContentType "application/json" -Body $body
    
    # Store the token
    $accessToken = $response.access_token
    $tokenType = $response.token_type
    $expiresIn = $response.expires_in
    
    Write-Host "`n✅ OAuth Token Retrieved Successfully!" -ForegroundColor Green
    Write-Host "Token Type: $tokenType" -ForegroundColor Cyan
    Write-Host "Expires In: $expiresIn seconds" -ForegroundColor Cyan
    Write-Host "Access Token: $($accessToken.Substring(0,50))..." -ForegroundColor Cyan
    
    # Store token in environment variable for this session
    $env:OAUTH_ACCESS_TOKEN = $accessToken
    Write-Host "`nToken stored in `$env:OAUTH_ACCESS_TOKEN" -ForegroundColor Green
    
    # Now call Connect token endpoint using the OAuth token
    $connectResponse = Get-ConnectToken -oauthToken $accessToken
    
    if ($connectResponse) {
        Write-Host "`n🎉 Both OAuth and Connect tokens retrieved successfully!" -ForegroundColor Green
        return @{
            oauth = $response
            connect = $connectResponse
        }
    } else {
        Write-Host "`n⚠️ OAuth token retrieved but Connect token failed" -ForegroundColor Yellow
        return $response
    }
    
} catch {
    Write-Error "Failed to get OAuth token: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error details: $errorContent" -ForegroundColor Red
    }
    exit 1
}
