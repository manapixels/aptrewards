import EditProgramForm from '@/components/admin/edit/EditProgramForm';
import { Metadata } from "next";
import { appName } from "@/constants";

export const metadata: Metadata = {
    title: `${appName} | Edit Program`,
}

export default function EditProgramPage({ params }: { params: { programId: string } }) {

    return (
        <div className="space-y-4">
            <EditProgramForm programId={params.programId} />
        </div>
    );
}
