import { NextRequest, NextResponse } from "next/server";

interface ConnectTokenRequest {
  external_user_id: string;
  allowed_origins?: string[];
  error_redirect_uri?: string;
  success_redirect_uri?: string;
  webhook_uri?: string;
}

interface ConnectTokenResponse {
  connect_link_url: string;
  expires_at: string;
  token: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ConnectTokenRequest = await req.json();

    // Validate required fields
    if (!body.external_user_id) {
      return NextResponse.json(
        { 
          error: "Missing required parameter",
          message: "external_user_id is required"
        },
        { status: 400 }
      );
    }

    // Get OAuth token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: "Missing or invalid authorization header",
          message: "Authorization header with Bearer token is required"
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get environment variables
    const projectId = "proj_mJsAlN1"; // Use the working project ID
    const environment = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development';

    if (!projectId) {
      return NextResponse.json(
        { 
          error: "Missing Pipedream configuration",
          message: "PIPEDREAM_PROJECT_ID environment variable must be set"
        },
        { status: 500 }
      );
    }

    console.log('Successfully got OAuth token, creating Connect token...', {
      external_user_id: body.external_user_id,
      project_id: projectId,
      environment: environment,
      allowed_origins: body.allowed_origins || ['http://localhost:3000']
    });

    // Use the exact same approach as the working PowerShell script
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Create the exact same PowerShell command as the working script
    const psCommand = `$connectBody = @{ external_user_id = '${body.external_user_id}'; allowed_origins = @('${req.nextUrl.origin}') } | ConvertTo-Json; Invoke-RestMethod -Uri 'https://api.pipedream.com/v1/connect/${projectId}/tokens' -Method POST -Headers @{ 'Authorization' = 'Bearer ${accessToken}'; 'Content-Type' = 'application/json'; 'x-pd-environment' = '${environment}' } -Body $connectBody | ConvertTo-Json`;
    
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
    const connectTokenData: ConnectTokenResponse = JSON.parse(stdout);

    console.log('Successfully created Connect token:', {
      expires_at: connectTokenData.expires_at,
      token_preview: connectTokenData.token.substring(0, 20) + '...',
      connect_link_url: connectTokenData.connect_link_url
    });

    return NextResponse.json(connectTokenData);

  } catch (error) {
    console.error('Error creating Connect token:', error);
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error occurred while creating Connect token',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
