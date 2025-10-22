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
import { type App, createFrontendClient, type ConnectResult, type Account } from '@pipedream/sdk/browser';
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  
  const { data: session } = useEffectiveSession();

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, []); // Empty dependency array - only run on unmount

  // Reset connecting state if it gets stuck
  useEffect(() => {
    if (isConnecting) {
      const timeout = setTimeout(() => {
        console.warn('Connection timeout - resetting connecting state');
        setIsConnecting(false);
        setConnectionError('Connection timed out. Please try again.');
      }, 120000); // 2 minute timeout (120 seconds)
      
      setConnectionTimeout(timeout);
      
      // Cleanup function
      return () => {
        clearTimeout(timeout);
      };
    } else {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
    }
  }, [isConnecting]); // Removed connectionTimeout from dependencies

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
    console.log('Using logged-in user ID:', session?.user?.id);
    
    // Close the selector first
    setIsAppSelectorOpen(false);
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      setConnectionError('Please sign in to connect accounts');
      return;
    }
    
    // Check if app has an ID
    if (!app.id) {
      setConnectionError('Invalid app: missing app ID');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Create Connect Link URL directly using Pipedream Connect API
      console.log('Creating Connect Link for:', { appId: app.id, userId: session.user.id, appName: app.name });
      
      const response = await fetch('/api/create-connect-link-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: app.id,
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate Connect Link: ${response.status}`);
      }

      const { connectLinkUrl, token } = await response.json();

      if (!connectLinkUrl || !token) {
        throw new Error('Invalid Connect Link response');
      }

      // Create Pipedream frontend client
      const pd = createFrontendClient({
        externalUserId: session.user.id,
      });
      
      // Initiate OAuth connection using the generated Connect Link
      pd.connectAccount({
        app: app.id,
        token: token,
        onSuccess: async ({ id: accountId }: ConnectResult) => {
          console.log('Successfully connected account:', accountId);
          setIsConnecting(false);
          
          // Refresh the connected accounts list
          await loadConnectedAccounts();
          
          // Optional: Fetch and display account details
          if (accountId) {
            try {
              const account = await getConnectedAccountById(accountId);
              console.log('Connected account details:', account);
            } catch (error) {
              console.error('Error fetching account details:', error);
            }
          }
          
          // Show success message (you could replace this with a toast notification)
          alert(`Successfully connected to ${app.name}!`);
        },
        onError: (error) => {
          console.error('Connection error:', error);
          setConnectionError(`Failed to connect to ${app.name}: ${error.message || 'Unknown error'}`);
          setIsConnecting(false);
        },
      });
    } catch (error) {
      console.error('Error initiating connection:', error);
      setConnectionError(`Failed to initiate connection to ${app.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  // Manual reset function for stuck connections
  const resetConnectionState = () => {
    setIsConnecting(false);
    setConnectionError(null);
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
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
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>{isConnecting ? 'Connecting...' : 'Connect new app'}</span>
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
                  {isConnecting && (
                    <div className="px-2 py-1">
                      <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting... (2min timeout)</span>
                      </div>
                      <div className="px-2 py-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={resetConnectionState}
                        >
                          Cancel
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
