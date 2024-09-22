import Link from 'next/link';
import Image from 'next/image';

import { WalletSelector } from '@/components/onchain/WalletSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Card, CardContent } from '@/components/ui/card';
import CustomerMenuPanel from '@/components/customer/CustomerMenuPanel';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
                <div className="flex flex-row justify-between items-center my-2 mx-4">
                    <Link href="/">
                        <div className="text-xl font-bold flex flex-row gap-2">
                            <Image src="/logo.svg" alt="AptRewards" width={160} height={26} />
                        </div>
                    </Link>
                    <div className="flex flex-row gap-2">
                        <WalletSelector />
                        <ThemeToggle />
                    </div>
                </div>
                <div>
                    <Card className="m-4 border-none md:border shadow-none md:shadow-sm">
                        <CardContent className="p-0 md:p-6">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <CustomerMenuPanel />
        </div>

    )
}