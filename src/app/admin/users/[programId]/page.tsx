import UsersInProgramTable from '@/components/admin/users/UsersInProgramTable';

const UsersInProgramPage = ({ params }: { params: { programId: string }}) => {
  return (
    <div className="p-4">
      <UsersInProgramTable programId={params.programId} />
    </div>
  );
};

export default UsersInProgramPage;