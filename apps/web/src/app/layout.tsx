import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Oxycure ERP',
  description: 'Enterprise Resource Planning — Lead to Revenue',
  // icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: { borderRadius: '12px', fontFamily: 'inherit' },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
