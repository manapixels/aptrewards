import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AutoConnectProvider } from '@/components/onchain/AutoConnectProvider';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { WalletProvider } from '@/components/onchain/WalletProvider';
import './globals.css';
import dotenv from 'dotenv';
import { Toaster } from 'react-hot-toast';
import { appName } from "@/constants";

const inter = Inter({ subsets: ['latin'] });

dotenv.config();

export const metadata: Metadata = {
  title: appName,
  description: `A loyalty program on Aptos.`,
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} custom-scrollbar`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AutoConnectProvider>
            <WalletProvider>
              {children}
              <Toaster 
                position="bottom-center"
                toastOptions={
                  {
                    style: {
                      background: '#333',
                      color: '#fff',
                    },
                  }
                } />
            </WalletProvider>
          </AutoConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
