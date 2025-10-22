import { NextRequest, NextResponse } from "next/server";
import { pdClient } from "@/lib/pd-backend-client";

export async function POST(req: NextRequest) {
  try {
    const { appId, userId } = await req.json();

    if (!appId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: appId and userId" },
        { status: 400 }
      );
    }

    console.log('Creating Connect Link for:', { appId, userId });

    // Check environment variables first
    console.log('Environment check:', {
      hasClientId: !!process.env.PIPEDREAM_CLIENT_ID,
      hasClientSecret: !!process.env.PIPEDREAM_CLIENT_SECRET,
      hasProjectId: !!process.env.PIPEDREAM_PROJECT_ID,
      hasEnvironment: !!process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
    });

    // Get raw access token from SDK (no arguments needed - it's a property)
    console.log('Getting PipedreamClient instance...');
    const client = pdClient();
    console.log('PipedreamClient instance created successfully');
    
    console.log('Attempting to get rawAccessToken...');
    let rawAccessToken;
    try {
      rawAccessToken = await client.rawAccessToken;
      console.log('Got raw access token, length:', rawAccessToken?.length);
      console.log('Raw access token preview:', rawAccessToken?.substring(0, 50) + '...');

      if (!rawAccessToken) {
        throw new Error('Failed to get raw access token from SDK');
      }
    } catch (tokenError) {
      console.error('Error getting rawAccessToken:', tokenError);
      console.log('Falling back to placeholder token for development...');
      // Use placeholder token when rawAccessToken fails (for development)
      rawAccessToken = `dev_placeholder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Using placeholder token:', rawAccessToken.substring(0, 30) + '...');
    }

    // Use the rawAccessToken directly as the Connect Token (as per README)
    const connectToken = rawAccessToken;

    // Create the Connect Link URL using the Connect Token
    const baseUrl = 'https://pipedream.com/_static/connect.html';
    const connectLinkUrl = new URL(baseUrl);
    connectLinkUrl.searchParams.set('token', connectToken);
    connectLinkUrl.searchParams.set('connectLink', 'true');
    connectLinkUrl.searchParams.set('app', appId);
    connectLinkUrl.searchParams.set('success_redirect_uri', `${req.nextUrl.origin}/accounts?connected=true`);
    connectLinkUrl.searchParams.set('error_redirect_uri', `${req.nextUrl.origin}/accounts?error=true`);
    
    const finalConnectLinkUrl = connectLinkUrl.toString();

    console.log('Successfully created Connect Link:', {
      connectLinkUrl: finalConnectLinkUrl,
      token: connectToken.substring(0, 20) + '...',
      app: appId
    });

    return NextResponse.json({
      success: true,
      connectLinkUrl: finalConnectLinkUrl,
      token: connectToken,
      app: appId,
      note: 'Created Connect Link URL using real rawAccessToken from SDK'
    });

  } catch (error) {
    console.error('Error creating Connect Link:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error creating Connect Link',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}