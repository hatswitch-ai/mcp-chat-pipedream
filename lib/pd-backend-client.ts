import { PipedreamClient } from '@pipedream/sdk';

let _pd: PipedreamClient | undefined;

export function pdClient(): PipedreamClient {
  // Check for required environment variables
  if (!process.env.PIPEDREAM_CLIENT_ID || !process.env.PIPEDREAM_CLIENT_SECRET) {
    console.error('Missing Pipedream credentials:', {
      hasClientId: !!process.env.PIPEDREAM_CLIENT_ID,
      hasClientSecret: !!process.env.PIPEDREAM_CLIENT_SECRET,
    });
    throw new Error('Missing required Pipedream credentials: PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET must be set');
  }
  
  // Use singleton pattern - reuse existing client instance
  if (_pd) return _pd;
  
  _pd = new PipedreamClient({
    clientId: process.env.PIPEDREAM_CLIENT_ID,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
    projectId: process.env.PIPEDREAM_PROJECT_ID,
    projectEnvironment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development',
  });
  
  return _pd;
}

export const pdHeaders = async (exuid: string) => {
  const accessToken = await pdClient().rawAccessToken;

  return {
    Authorization: `Bearer ${accessToken}`,
    "x-pd-project-id": process.env.PIPEDREAM_PROJECT_ID,
    "x-pd-environment": process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
    "x-pd-external-user-id": exuid,
  };
};
