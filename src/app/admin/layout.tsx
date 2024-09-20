import ProgramListSidebar from '@/components/admin/ProgramListSidebar';
import { isMobile } from 'react-device-detect';

export default function Layout({ children }: { children: React.ReactNode }) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 relative">
                <ProgramListSidebar />
            </div>
            <div className="col-span-1 md:col-span-2">{children}</div>
        </div>
    )
}