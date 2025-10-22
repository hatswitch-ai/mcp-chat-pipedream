'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type App } from '@pipedream/sdk/browser';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface AppSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppSelect?: (app: App) => void;
  initialApps?: App[]; // Pre-fetched list of apps (only used in filtered mode)
  isLoadingInitialApps?: boolean; // Loading state for initial fetch (only used in filtered mode)
  allowAllApps?: boolean; // Whether to use original API behavior or local filtering
}

export function AppSelector({
  open,
  onOpenChange,
  onAppSelect,
  initialApps = [],
  isLoadingInitialApps = false,
  allowAllApps = false
}: AppSelectorProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Constants for responsive grid layout (only used in allowAllApps mode)
  const ROWS_PER_PAGE = 5;
  const BREAKPOINT_MD = 768; // Medium screens (3 columns)
  const BREAKPOINT_SM = 640; // Small screens (2 columns)
  const [pageSize, setPageSize] = useState(15);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const totalPages = Math.ceil(total / pageSize);

  // Update window width on resize (only for allowAllApps mode)
  useEffect(() => {
    if (typeof window === 'undefined' || !allowAllApps) return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [allowAllApps]);

  // Update page size based on window width (only for allowAllApps mode)
  useEffect(() => {
    if (!allowAllApps) return;

    let columns = 1;
    if (windowWidth >= BREAKPOINT_MD) {
      columns = 3;
    } else if (windowWidth >= BREAKPOINT_SM) {
      columns = 2;
    }

    const newPageSize = columns * ROWS_PER_PAGE;
    setPageSize(newPageSize);
  }, [windowWidth, allowAllApps]);

  // Local filtering for restricted mode using useMemo to prevent infinite loops
  const filteredApps = useMemo(() => {
    if (!allowAllApps) {
      const lowerCaseSearch = search.toLowerCase();
      return initialApps.filter(app =>
        app.name.toLowerCase().includes(lowerCaseSearch)
      );
    }
    return [];
  }, [search, initialApps, allowAllApps]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      if (allowAllApps) {
        setApps([]);
        setPage(1);
      }
    }
  }, [open, allowAllApps]);

  // API fetching for allowAllApps mode
  const fetchApps = async (searchTerm: string, pageNum: number, size: number) => {
    const params = new URLSearchParams({
      search: searchTerm,
      page: pageNum.toString(),
      pageSize: size.toString(),
    });

    const response = await fetch(`/api/list-apps?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load apps: ${response.status}`);
    }

    return await response.json();
  };


  // Fetch apps when dialog opens or search changes (only for allowAllApps mode)
  useEffect(() => {
    if (!open || !allowAllApps) return;

    const fetchApps = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          search,
          page: '1',
          pageSize: pageSize.toString(),
        });

        const response = await fetch(`/api/list-apps?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load apps: ${response.status}`);
        }

        const res = await response.json();

        if (!res || !res.data || !Array.isArray(res.data)) {
          setError("Error: Invalid data format received from server");
          setApps([]);
          setTotal(0);
          return;
        }

        setApps(res.data);
        setTotal(res.response?.pageInfo?.totalCount || res.data.length);
        setPage(1);
      } catch (error) {
        setError(
          `Error: ${error instanceof Error ? error.message : "Failed to fetch apps"}`
        );
        setApps([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [open, allowAllApps, search, pageSize]);

  // Load more functionality for allowAllApps mode
  const handleLoadMore = async () => {
    if (!allowAllApps || page >= totalPages) return;

    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);

    try {
      const res = await fetchApps(search, nextPage, pageSize);
      const totalCount = res?.response?.pageInfo?.totalCount || res?.data?.length || 0;

      if (res?.data && Array.isArray(res.data)) {
        setApps((currentApps) => {
          const currentIds = new Set(currentApps.map((app) => app.id));
          const newUniqueApps = res.data.filter(
            (app: App) => !currentIds.has(app.id)
          );
          return [...currentApps, ...newUniqueApps];
        });
        setTotal(totalCount || 0);
      }
    } catch (error) {
      console.error("Error loading more apps:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renders the app logo based on available image sources
   */
  const renderAppLogo = (app: App) => {
    if (app.id) {
      return (
        <img
          src={`https://pipedream.com/s.v0/${app.id}/logo/48`}
          alt={`${app.name} logo`}
          className="max-w-full max-h-full object-contain"
        />
      );
    }

    if (app.imgSrc) {
      return (
        <img
          src={app.imgSrc}
          alt={`${app.name} logo`}
          className="max-w-full max-h-full object-contain"
        />
      );
    }

    // Fallback to first letter of name
    return (
      <div className="size-full bg-muted flex items-center justify-center">
        <span className="text-xs">{(app.name || app.nameSlug || 'A').charAt(0)}</span>
      </div>
    );
  };

  /**
   * Handles the app selection and closes the dialog
   */
  const handleAppClick = (app: App) => {
    if (onAppSelect) {
      onAppSelect(app);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Explore available tools</DialogTitle>
          <DialogDescription className="sr-only">
            Browse and select from available integration tools
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-2 pr-2 h-[490px] scroll-behavior-auto relative pb-10">
          {(() => {
            // Determine which apps to display and loading state
            const displayApps = allowAllApps ? apps : filteredApps;
            const isLoading = allowAllApps ? loading : isLoadingInitialApps;
            const hasError = allowAllApps ? error : null;

            if (isLoading && displayApps.length === 0) {
              return (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              );
            }

            if (hasError) {
              return (
                <div className="flex flex-col justify-center items-center h-full">
                  <div className="text-center text-destructive">
                    {hasError}
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => allowAllApps && fetchInitialApps()}>
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            if (displayApps.length === 0) {
              return (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center text-muted-foreground">
                    <p className="mb-2">We couldn&apos;t find that app. Request new integrations{" "}
                      <a
                        href="https://pipedream.com/support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 hover:underline underline-offset-4"
                      >
                        here
                      </a>.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 relative pb-4 px-4">
                  {displayApps.map((app, index) => (
                    <button
                      type="button"
                      key={app.id}
                      className="flex flex-col w-full rounded-md hover:shadow-lg dark:hover:shadow-cyan-900/40 hover:border-gray-300 dark:hover:border-gray-700 transition-all text-left h-[170px] overflow-hidden border border-gray-100 dark:border-gray-800 group"
                      onClick={() => handleAppClick(app)}
                    >
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <div className="size-8 rounded-sm overflow-hidden flex-shrink-0 bg-white dark:bg-white flex items-center justify-center p-1">
                          {renderAppLogo(app)}
                        </div>
                        <div className="font-medium">
                          {app.name || app.nameSlug || 'Unnamed App'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 px-4 pt-3 flex flex-col h-full">
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {app.description || 'No description available'}
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200">
                          {app.categories?.join(', ') || 'Uncategorized'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="py-3 border-t mt-1 flex flex-col sm:flex-row justify-between items-center px-6 gap-3">
          <div className="hidden sm:block w-28"></div> {/* Empty space to balance layout on larger screens */}

          {allowAllApps && page < totalPages ? (
            <Button
              variant="outline"
              size="default"
              onClick={async (e) => {
                // Constants for layout calculations
                const CARD_HEIGHT = 170; // Height of each app card in pixels
                const GAP_SIZE = 12; // Gap between cards (gap-3 = 0.75rem = 12px)

                // Remember current visible app count before loading more
                const previousAppCount = apps.length;

                // Load more content
                await handleLoadMore();

                // After content loads, scroll to the appropriate position
                setTimeout(() => {
                  const scrollContainer = document.querySelector('[role="dialog"] .overflow-y-auto');
                  if (scrollContainer) {
                    // Calculate grid layout based on current window width
                    let columnsPerRow = 1; // Default to mobile
                    if (windowWidth >= BREAKPOINT_MD) {
                      columnsPerRow = 3; // Desktop
                    } else if (windowWidth >= BREAKPOINT_SM) {
                      columnsPerRow = 2; // Tablet
                    }

                    // Calculate the row where new content starts
                    const prevRows = Math.ceil(previousAppCount / columnsPerRow);

                    // Calculate scroll position (including gaps)
                    const scrollPosition = prevRows * (CARD_HEIGHT + GAP_SIZE) - GAP_SIZE;

                    // Scroll to that position with smooth behavior
                    scrollContainer.scrollTo({
                      top: scrollPosition,
                      behavior: 'smooth'
                    });
                  }
                }, 100); // Short delay to ensure the DOM has updated
              }}
              disabled={loading}
              className="min-w-36 order-1 sm:order-2 font-semibold"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Loading</span>
                </span>
              ) : 'Load more'}
            </Button>
          ) : (
            <div className="sm:block hidden order-2"></div> /* Empty div when no more pages (hidden on mobile) */
          )}

          <span className="text-sm text-muted-foreground font-medium text-center whitespace-nowrap w-28 order-2 sm:order-3">
            {allowAllApps 
              ? `${total} available apps`
              : `${filteredApps.length} of ${initialApps.length} apps`
            }
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
