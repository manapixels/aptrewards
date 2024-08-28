import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AutoConnectProvider } from '@/components/AutoConnectProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WalletProvider } from '@/components/WalletProvider';
import { WalletSelector } from '@/components/WalletSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

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
              <div className="flex flex-row justify-between items-center my-2 mx-4">
                <Link href="/">
                  <div className="text-xl font-bold flex flex-row gap-2">
                    <Image src="/logo.svg" alt="AptRewards" width={28} height={28} />
                    <div>AptRewards</div>
                  </div>
                </Link>
                <div className="flex flex-row gap-2">
                  <WalletSelector />
                  <ThemeToggle />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="my-2 ml-4 col-span-1">
                  <CardContent className="pt-6">
                    <div className="mb-4">Your Programs</div>
                    <div>list</div>
                    <Link href="/new"><Button variant="outline" className="w-full" size="sm">+ New</Button></Link>
                  </CardContent>
                </Card>
                <Card className="my-2 mr-4 col-span-2">
                  <CardContent className="pt-6">{children}</CardContent>
                </Card>
              </div>

            </WalletProvider>
          </AutoConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
