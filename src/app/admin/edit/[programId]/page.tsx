import EditExistingProgram from '@/components/contract/EditExistingProgramForm';

export default function EditExistingProgramPage({ params }: { params: { programId: string } }) {
    const programId = parseInt(params.programId);
    return (
        <div className="space-y-4">
            <EditExistingProgram programId={programId} />
        </div>
    );
}
