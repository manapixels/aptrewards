'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProgramStore } from '@/store/programStore';
import ProgramDetails from './ProgramDetails';
import ProgramTiers from './ProgramTiers';
import ProgramVouchers from './ProgramVouchers';

export default function EditProgramForm({ programId }: { programId: string }) {
    const { fetchProgramDetails, programs, isFetchingOneProgram } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());

    useEffect(() => {
        fetchProgramDetails(programId);
    }, [programId, fetchProgramDetails]);

    if (!currProgram && !isFetchingOneProgram) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No access to this loyalty program</AlertTitle>
                <AlertDescription>
                    Choose a different loyalty program to edit.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <div className="text-gray-500 text-sm">Rewards Program</div>
                <h1 className="font-bold text-2xl ml-2 my-4"><div className="inline bg-gray-100 px-2 py-1 h-100 mr-2"></div>{currProgram?.name}</h1>
            </div>
            {currProgram && (
                <>
                    <ProgramDetails program={currProgram} />
                    <ProgramTiers program={currProgram} />
                    <ProgramVouchers program={currProgram} />
                </>
            )}

        </div>
    );
}