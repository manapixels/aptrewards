import EditProgramForm from '@/components/contract/EditProgramForm';

export default function EditProgramPage({ params }: { params: { programId: string } }) {

    return (
        <div className="space-y-4">
            <EditProgramForm programId={params.programId} />
        </div>
    );
}
