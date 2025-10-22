'use client';

import { datadogRum } from '@datadog/browser-rum';

export default function DatadogInit() {
  if (typeof window !== 'undefined') {
    const applicationId = process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID;
    const clientToken = process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN;
    const isDatadogDisabled = process.env.NEXT_PUBLIC_DATADOG_DISABLED === 'true';
    
    // Only initialize if both required env vars are present and Datadog is not disabled
    if (applicationId && clientToken && !isDatadogDisabled) {
      datadogRum.init({
        applicationId,
        clientToken,
        // site: 'datadoghq.com',
        service: 'mcp-chat',
        env: process.env.NODE_ENV || 'development',
        // Specify a version number to identify the deployed version of your application in Datadog 
        // version: '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
    }
  }

  return null;
}