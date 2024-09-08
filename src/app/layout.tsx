import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AutoConnectProvider } from '@/components/AutoConnectProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WalletProvider } from '@/components/WalletProvider';
import { WalletSelector } from '@/components/WalletSelector';
// import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import dotenv from 'dotenv';

const inter = Inter({ subsets: ['latin'] });

dotenv.config();

export const metadata: Metadata = {
  title: `AptRewards`,
  description: `A loyalty program on Aptos.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="custom-scrollbar">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AutoConnectProvider>
            <WalletProvider>
              <div className="flex flex-row justify-between items-center my-2 mx-4">
                <Link href="/">
                  <div className="text-xl font-bold flex flex-row gap-2">
                    <Image src="/logo.svg" alt="AptRewards" width={28} height={28} />
                    <div>AptRewards</div>
                  </div>
                </Link>
                <div className="flex flex-row gap-2">
                  <WalletSelector />
                  {/* <ThemeToggle /> */}
                </div>
              </div>
              <div>
                <Card className="m-4">
                  <CardContent className="p-6">{children}</CardContent>
                </Card>
              </div>

            </WalletProvider>
          </AutoConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
