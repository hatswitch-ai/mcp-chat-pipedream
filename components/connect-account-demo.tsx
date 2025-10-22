'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PipedreamClient } from '@pipedream/sdk/browser';
import { useEffectiveSession } from '@/hooks/use-effective-session';

export function ConnectAccountDemo() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const { data: session } = useEffectiveSession();

  // Create PipedreamClient - we'll get the token manually
  const [connectToken, setConnectToken] = useState<string | null>(null);
  
  const client = useMemo(() => {
    if (!session?.user?.id || !connectToken) return null;
    
    const userId = session.user.id;
    
    return new PipedreamClient({
      projectId: "proj_mJsAlN1",
      projectEnvironment: (process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT as any) || 'development',
      externalUserId: userId,
      token: connectToken, // Pass the token as a string
    });
  }, [session?.user?.id, connectToken]);

  // Function to get Connect token
  const getConnectToken = async () => {
    if (!session?.user?.id) return null;
    
    console.log("🔄 Getting Connect token...");
    
    // First get OAuth token
    console.log("📞 Calling /api/oauth-token...");
    const oauthRes = await fetch("/api/oauth-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "*" }),
    });

    if (!oauthRes.ok) {
      console.error("❌ OAuth token failed:", oauthRes.status, oauthRes.statusText);
      throw new Error("Failed to fetch OAuth token");
    }
    const { access_token } = await oauthRes.json();
    if (!access_token) throw new Error("Failed to fetch OAuth token");
    console.log("✅ OAuth token received:", access_token.substring(0, 20) + "...");

    // Then get Connect token using OAuth token
    console.log("📞 Calling /api/connect-token...");
    const connectRes = await fetch("/api/connect-token", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${access_token}`
      },
      body: JSON.stringify({ external_user_id: session.user.id }),
    });

    if (!connectRes.ok) {
      console.error("❌ Connect token failed:", connectRes.status, connectRes.statusText);
      throw new Error("Failed to fetch Connect token");
    }
    const connectData = await connectRes.json();
    console.log("🔍 Full Connect token response:", connectData);
    
    const { token } = connectData;
    if (!token) {
      console.error("❌ No token in response:", connectData);
      throw new Error("Failed to fetch Connect token - no token in response");
    }
    console.log("✅ Connect token received:", token.substring(0, 20) + "...");
    return token;
  };

  async function connectAccount() {
    console.log("🔘 Connect button clicked");
    
    if (!session?.user?.id) {
      console.error("❌ No session");
      setConnectionStatus('Error: No session');
      return;
    }

    // Add postMessage listener to debug iframe communication
    const handleMessage = (event: MessageEvent) => {
      console.log("📨 Received postMessage:", event.data, "from origin:", event.origin);
    };
    
    window.addEventListener('message', handleMessage);
    
    // Clean up listener after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
    }, 30000);

    console.log("🚀 Starting connectAccount flow...");
    setIsConnecting(true);
    setConnectionStatus('Connecting...');

    try {
      // First get the Connect token
      console.log("🔑 Getting Connect token...");
      const token = await getConnectToken();
      setConnectToken(token);
      
      // Wait for the client to be created with the token
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("🔧 Calling client.connectAccount with app: google_sheets");
      
      if (!client) {
        console.error("❌ Client not initialized");
        setConnectionStatus('Error: Client not initialized');
        setIsConnecting(false);
        return;
      }
      
      client.connectAccount({
        app: "google_sheets",
        onSuccess: (account) => {
          // Handle successful connection
          console.log(`✅ Account successfully connected:`, account);
          setConnectionStatus(`✅ Successfully connected: ${account.id}`);
          setIsConnecting(false);
        },
        onError: (err) => {
          // Handle connection error
          console.error(`❌ Connection error:`, err);
          setConnectionStatus(`❌ Connection error: ${err.message}`);
          setIsConnecting(false);
        },
        onClose: () => {
          // Handle iframe close
          console.log(`🔄 Connect iframe closed`);
          setConnectionStatus(`🔄 Connect iframe closed - check if connection was successful`);
          setIsConnecting(false);
        },
      });
      
      console.log("🔧 connectAccount call completed");
    } catch (error) {
      console.error("❌ Error in connectAccount:", error);
      setConnectionStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  }

  if (!session?.user?.id) {
    return <div>Please log in to use Connect Account</div>;
  }

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-4">Connect Account Demo</h2>
      <p className="mb-4">This demonstrates the OAuth token flow + Connect token approach:</p>
      <ol className="list-decimal list-inside mb-4 space-y-1">
        <li>Get OAuth token from /api/oauth-token</li>
        <li>Use OAuth token to get Connect token from /api/connect-token</li>
        <li>Use Connect token with PipedreamClient.connectAccount()</li>
      </ol>
      
      <Button 
        onClick={connectAccount} 
        disabled={isConnecting}
        className="mb-4"
      >
        {isConnecting ? 'Connecting...' : 'Connect Google Sheets Account'}
      </Button>
      
      {connectionStatus && (
        <div className={`p-3 rounded ${
          connectionStatus.includes('✅') 
            ? 'bg-green-100 text-green-800' 
            : connectionStatus.includes('❌')
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {connectionStatus}
        </div>
      )}
    </main>
  );
}
