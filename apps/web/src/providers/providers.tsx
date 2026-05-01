'use client';

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { toast } from 'sonner';

function extractMessage(error: unknown): string {
  const axiosMsg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(axiosMsg)) return axiosMsg[0];
  if (typeof axiosMsg === 'string') return axiosMsg;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

function handle401(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login?reason=session_expired';
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            handle401(error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            handle401(error);
            const msg = extractMessage(error);
            toast.error(msg);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
