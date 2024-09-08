import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <Card className="my-2 ml-4 col-span-1">
                <CardContent className="pt-6">
                    <div className="mb-4">Your Programs</div>
                    <div>list</div>
                    <Link href="/new">
                        <Button variant="outline" className="w-full" size="sm">+ New</Button>
                    </Link>
                </CardContent>
            </Card>
            <Card className="my-2 mr-4 col-span-2">
                <CardContent className="pt-6">{children}</CardContent>
            </Card>
        </div>
    )
}