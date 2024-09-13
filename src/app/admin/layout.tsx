import ProgramListSidebar from '@/components/admin/ProgramListSidebar';

export default function Layout({ children }: { children: React.ReactNode }) {

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
                <ProgramListSidebar />
            </div>
            <div className="col-span-2">{children}</div>
        </div>
    )
}