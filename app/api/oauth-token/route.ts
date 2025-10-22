import { NextRequest, NextResponse } from "next/server";

interface OAuthTokenRequest {
  grant_type?: "client_credentials";
  scope?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: OAuthTokenRequest = await req.json();

    // Use environment variables for credentials
    const clientId = process.env.PIPEDREAM_CLIENT_ID;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;

    // Validate environment variables
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: "Missing Pipedream credentials",
          message: "PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET environment variables must be set",
          hint: "Create a .env.local file with your Pipedream OAuth client credentials"
        },
        { status: 500 }
      );
    }

    // Validate grant_type if provided, otherwise default to client_credentials
    const grantType = body.grant_type || "client_credentials";
    if (grantType !== "client_credentials") {
      return NextResponse.json(
        { 
          error: "Invalid grant_type",
          message: "Only 'client_credentials' grant type is supported"
        },
        { status: 400 }
      );
    }

    // Validate scope if provided
    const validScopes = [
      "*",
      "connect:*",
      "connect:actions:*",
      "connect:triggers:*",
      "connect:accounts:read",
      "connect:accounts:write",
      "connect:deployed_triggers:read",
      "connect:deployed_triggers:write",
      "connect:users:read",
      "connect:users:write",
      "connect:tokens:create",
      "connect:proxy",
      "connect:workflow:invoke"
    ];

    if (body.scope) {
      const scopes = body.scope.split(" ");
      const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
      
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { 
            error: "Invalid scope",
            message: `Invalid scopes: ${invalidScopes.join(", ")}. Valid scopes: ${validScopes.join(", ")}`
          },
          { status: 400 }
        );
      }
    }

    console.log('Generating OAuth token with params:', {
      grant_type: grantType,
      client_id: clientId.substring(0, 8) + '...',
      scope: body.scope || '* (default)'
    });

    // Use the working PowerShell approach - call Pipedream directly
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Create PowerShell command to get OAuth token
    const psCommand = `$body = @{ grant_type = 'client_credentials'; client_id = '${clientId}'; client_secret = '${clientSecret}'; scope = '${body.scope || '*'}'; } | ConvertTo-Json; Invoke-RestMethod -Uri 'https://api.pipedream.com/v1/oauth/token' -Method POST -ContentType 'application/json' -Body $body | ConvertTo-Json`;
    
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
    const tokenData: OAuthTokenResponse = JSON.parse(stdout);

    console.log('Successfully generated OAuth token:', {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      access_token_preview: tokenData.access_token.substring(0, 20) + '...'
    });

    return NextResponse.json(tokenData);

  } catch (error) {
    console.error('Error generating OAuth token:', error);
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error occurred while generating OAuth token',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
