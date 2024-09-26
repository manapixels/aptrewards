import UsersInProgramTable from '@/components/admin/users/UsersInProgramTable';
import { Metadata } from "next";
import { appName } from "@/constants";

export const metadata: Metadata = {
    title: `${appName} | Users in Program`,
}

const UsersInProgramPage = ({ params }: { params: { programId: string }}) => {
  return (
    <div className="p-4">
      <UsersInProgramTable programId={params.programId} />
    </div>
  );
};

export default UsersInProgramPage;