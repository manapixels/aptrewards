import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AutoConnectProvider } from '@/components/AutoConnectProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WalletProvider } from '@/components/WalletProvider';
import { WalletSelector } from '@/components/WalletSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `AptRewards`,
  description: `A loyalty program on Aptos.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AutoConnectProvider>
            <WalletProvider>
              <div className="flex flex-row justify-between">
                <div className="text-4xl font-bold">AptRewards</div>
                <div className="flex flex-row">
                  <WalletSelector />
                  <ThemeToggle />
                </div>
              </div>
              
              {children}
            </WalletProvider>
          </AutoConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
