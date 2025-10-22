import { pdClient } from "@/lib/pd-backend-client"
import { NextRequest, NextResponse } from "next/server"

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const allowAllApps = process.env.PIPEDREAM_ALLOW_ALL_APPS === 'true';
    
    console.log('Environment check:', {
      hasClientId: !!process.env.PIPEDREAM_CLIENT_ID,
      hasClientSecret: !!process.env.PIPEDREAM_CLIENT_SECRET,
      hasProjectId: !!process.env.PIPEDREAM_PROJECT_ID,
      hasEnvironment: !!process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
      allowAllApps,
      appFilter: process.env.PIPEDREAM_APP_FILTER || 'none',
    });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, Number.parseInt(searchParams.get("pageSize") || "15"));

    let apiQuery = "";
    let limit = 100;

    if (allowAllApps) {
      // Original behavior: use client search and pagination
      apiQuery = search;
      limit = Math.min(page * pageSize, 100); // API max 100
    } else {
      // Restricted behavior: only use environment filter, ignore client search
      const appFilter = process.env.PIPEDREAM_APP_FILTER || "";
      apiQuery = appFilter;
      limit = 100; // Fetch all matching apps
    }

    // Create cache key based on mode and parameters
    const cacheKey = allowAllApps 
      ? `${apiQuery}-${page}-${pageSize}` 
      : `${apiQuery}-${limit}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached apps data');
      return NextResponse.json(cached.data);
    }

    console.log('Attempting to fetch apps with params:', {
      allowAllApps,
      limit,
      apiQuery,
      search: allowAllApps ? search : 'N/A (filtered mode)',
      page: allowAllApps ? page : 'N/A (filtered mode)',
      pageSize: allowAllApps ? pageSize : 'N/A (filtered mode)',
    });

    // Retry logic for temporary failures
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Fetch attempt ${attempt}/3...`);
        
        const res = await pdClient().apps.list({
          limit,
          q: apiQuery,
          sortKey: "featured_weight",
          sortDirection: "desc",
        });

        console.log('Successfully fetched apps:', { 
          count: res.data?.length || 0,
          hasData: !!res.data
        });

        // Add mode information to response
        const responseWithMode = {
          ...res,
          mode: {
            allowAllApps,
            isFiltered: !allowAllApps
          }
        };

        // Cache the result
        cache.set(cacheKey, { data: responseWithMode, timestamp: Date.now() });

        return NextResponse.json(responseWithMode);
      } catch (error) {
        lastError = error;
        console.error(`Fetch attempt ${attempt} failed:`, error);
        
        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw lastError;
  } catch (error) {
    console.error('Detailed error fetching apps:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    // Check if it's a missing credentials error
    if (error instanceof Error && error.message.includes('Missing required Pipedream credentials')) {
      return NextResponse.json(
        { 
          error: 'Pipedream credentials not configured',
          message: 'Please set PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET environment variables',
          data: [],
          response: { pageInfo: { totalCount: 0 } }
        },
        { status: 500 }
      );
    }
    
    // Return empty result for other errors
    return NextResponse.json(
      { 
        error: 'Failed to fetch apps',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        response: { pageInfo: { totalCount: 0 } }
      },
      { status: 500 }
    );
  }
}
