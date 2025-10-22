'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AppSelector } from '@/components/app-selector';
import { 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarGroup, 
  SidebarGroupContent
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Link as LinkIcon,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { type App, PipedreamClient, type ConnectResult, type Account } from '@pipedream/sdk/browser';
import { useEffectiveSession } from '@/hooks/use-effective-session';
import { getConnectedAccountById, getConnectedAccounts, deleteConnectedAccount } from '@/app/(chat)/accounts/actions';
import Image from 'next/image';

export function SidebarConnections() {
  const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [appsFromApi, setAppsFromApi] = useState<App[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true); // Start loading immediately
  const [errorFetchingApps, setErrorFetchingApps] = useState<string | null>(null);
  const [allowAllApps, setAllowAllApps] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  
  const { data: session } = useEffectiveSession();

  // Create PipedreamClient with tokenCallback
  const client = useMemo(() => {
    if (!session?.user?.id) return null;
    
    const userId = session.user.id; // Store in variable to avoid repeated access
    
    return new PipedreamClient({
      projectEnvironment: (process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT as any) || 'development',
      externalUserId: userId,
      tokenCallback: async () => {
        // First get OAuth token
        const oauthRes = await fetch("/api/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "*" }),
        });

        if (!oauthRes.ok) throw new Error("Failed to fetch OAuth token");
        const { access_token } = await oauthRes.json();
        if (!access_token) throw new Error("Failed to fetch OAuth token");

        // Then get Connect token using OAuth token
        const connectRes = await fetch("/api/connect-token", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
          },
          body: JSON.stringify({ external_user_id: userId }),
        });

        if (!connectRes.ok) throw new Error("Failed to fetch Connect token");
        const { token } = await connectRes.json();
        if (!token) throw new Error("Failed to fetch Connect token");
        return token;
      },
    });
  }, [session?.user?.id]);

  // Memoize the apps array to prevent unnecessary re-renders
  const memoizedApps = useMemo(() => appsFromApi, [appsFromApi]);

  // Function to load connected accounts
  const loadConnectedAccounts = async () => {
    if (!session?.user?.id) return;
    
    setIsLoadingAccounts(true);
    try {
      const accounts = await getConnectedAccounts();
      setConnectedAccounts(accounts);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };


  useEffect(() => {
    const fetchInitialApps = async () => {
      setIsLoadingApps(true);
      setErrorFetchingApps(null);
      try {
        const res = await fetch('/api/list-apps'); // No search, page, pageSize here
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch apps');
        }
        const data = await res.json();
        
        // Check if the response includes mode information
        if (data.mode) {
          setAllowAllApps(data.mode.allowAllApps || false);
        }
        
        setAppsFromApi(data.data || []);
      } catch (err: any) {
        console.error('Error fetching initial apps for selector:', err);
        setErrorFetchingApps(err.message || 'Error fetching apps');
      } finally {
        setIsLoadingApps(false);
      }
    };
    fetchInitialApps();
  }, []); // Empty dependency array means run once on mount

  // Load connected accounts when component mounts or user changes
  useEffect(() => {
    loadConnectedAccounts();
  }, [session?.user?.id]); // Reload when user changes

  const handleAppSelect = async (app: App) => {
    console.log('Selected app:', app);
    setIsAppSelectorOpen(false);
    
    if (!client) {
      setConnectionError('Please sign in to connect accounts');
      return;
    }
    
    if (!app.id) {
      setConnectionError('Invalid app: missing app ID');
      return;
    }
    
    try {
      // SDK handles everything - no manual URL construction
      client.connectAccount({
        app: app.id,
        onSuccess: async (account) => {
          console.log('Successfully connected account:', account.id);
          await loadConnectedAccounts();
          alert(`Successfully connected to ${app.name}!`);
        },
        onError: (error) => {
          console.error('Connection error:', error);
          setConnectionError(`Failed to connect to ${app.name}: ${error.message || 'Unknown error'}`);
        },
      });
    } catch (error) {
      console.error('Error initiating connection:', error);
      setConnectionError(`Failed to initiate connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Manual reset function for connection errors
  const resetConnectionState = () => {
    setConnectionError(null);
  };

  // Function to handle account deletion
  const handleDeleteAccount = async (accountId: string) => {
    try {
      setDeletingAccountId(accountId);
      await deleteConnectedAccount(accountId);
      // Refresh the connected accounts list
      await loadConnectedAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      setConnectionError('Failed to delete account. Please try again.');
    } finally {
      setDeletingAccountId(null);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <Collapsible open={isConnectionsOpen} onOpenChange={setIsConnectionsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="w-full">
                <LinkIcon className="h-4 w-4" />
                <span>Connections</span>
                {isConnectionsOpen ? (
                  <ChevronDown className="ml-auto h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="px-2 py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-8 px-2"
                      onClick={() => setIsAppSelectorOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Connect new app</span>
                    </Button>
                  </div>
                  <div className="px-2 py-1">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start gap-2 h-8 px-2"
                        onClick={() => window.open('/accounts', '_blank')}
                      >
                        <Search className="h-4 w-4" />
                        <span>Manage connections</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={loadConnectedAccounts}
                        disabled={isLoadingAccounts}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Connected Accounts List */}
                  {connectedAccounts.length > 0 && (
                    <div className="px-2 py-1">
                      <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        Connected Apps ({connectedAccounts.length})
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {connectedAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {account.app?.imgSrc ? (
                                <div className="size-6 rounded-sm overflow-hidden flex items-center justify-center bg-gray-100 p-0.5 flex-shrink-0">
                                  <Image
                                    src={account.app.imgSrc}
                                    alt={account.app.name || 'App icon'}
                                    className="size-full object-contain"
                                    width={24}
                                    height={24}
                                  />
                                </div>
                              ) : (
                                <div className="size-6 rounded-sm flex items-center justify-center bg-gray-100 flex-shrink-0">
                                  <span className="text-xs font-bold text-gray-400">
                                    {account.app?.name?.charAt(0).toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                  {account.app?.name || 'Unknown App'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {account.name || 'Unnamed account'}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => {
                                if (account.id) {
                                  handleDeleteAccount(account.id);
                                }
                              }}
                              disabled={deletingAccountId === account.id}
                            >
                              {deletingAccountId === account.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3 text-destructive" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Loading state for accounts */}
                  {isLoadingAccounts && (
                    <div className="px-2 py-1">
                      <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading accounts...</span>
                      </div>
                    </div>
                  )}
                  {connectionError && (
                    <div className="px-2 py-1">
                      <div className="flex items-center gap-2 px-2 py-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="truncate">{connectionError}</span>
                      </div>
                      <div className="px-2 py-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={resetConnectionState}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarMenu>

      <AppSelector
        open={isAppSelectorOpen}
        onOpenChange={setIsAppSelectorOpen}
        onAppSelect={handleAppSelect}
        initialApps={memoizedApps}
        isLoadingInitialApps={isLoadingApps}
        allowAllApps={allowAllApps}
      />
    </>
  );
}
