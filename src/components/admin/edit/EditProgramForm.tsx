'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useProgramStore } from '@/store/programStore';
import ProgramDetails from './ProgramDetails';
import ProgramTiers from './ProgramTiers';
import ProgramVouchers from './ProgramVouchers';
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProgramForm({ programId }: { programId: string }) {
    const { fetchProgramDetails, programs } = useProgramStore();
    const currProgram = programs.find(program => program.id === programId.toString());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetchProgramDetails(programId).then(() => setIsLoading(false));
    }, [programId, fetchProgramDetails]);

    const renderSkeletons = () => (
        <>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-[200px] w-full mb-4" />
            <Skeleton className="h-[300px] w-full mb-4" />
            <Skeleton className="h-[200px] w-full" />
        </>
    );

    if (isLoading) {
        return renderSkeletons();
    }

    if (!currProgram && !isLoading) {
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
                <div className="flex items-center my-2">
                    <div className="h-auto w-8 patterned-placeholder self-stretch"></div>
                    <h1 className="font-bold text-2xl px-3 py-3">
                        {/* <div className="inline bg-gray-100 px-2 py-1 h-100 mr-2"></div> */}
                        {currProgram?.name}
                    </h1>
                    <div className="flex-1 h-auto w-auto patterned-placeholder self-stretch"></div>
                </div>
            </div>
            {currProgram && (
                <>
                    <ProgramDetails program={currProgram} isLoading={isLoading} />
                    <ProgramTiers program={currProgram} isLoading={isLoading} />
                    <ProgramVouchers program={currProgram} isLoading={isLoading} />
                </>
            )}

        </div>
    );
}