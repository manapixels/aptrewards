import CreateNewProgram from '@/components/admin/new/CreateNewProgramForm';
import { Metadata } from "next";
import { appName } from "@/constants";

export const metadata: Metadata = {
  title: `${appName} | Create New Program`,
}

export default function CreateNewProgramPage() {
  return (
    <div>
      <CreateNewProgram />
    </div>
  );
}
