'use client'

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layers, Ticket, Users } from 'lucide-react';

const AdminMenuPanel: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg md:hidden z-50 border-t border-gray-300">
      <nav className="flex justify-around">
        <Link href="/admin/programs" className={`flex flex-col items-center py-2 px-4 ${
          pathname === '/admin/programs' ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <Layers className="h-6 w-6" />
          <span className="text-xs mt-1">Programs</span>
        </Link>
        <Link href="/admin/issue" className={`flex flex-col items-center py-2 px-4 ${
          pathname === '/admin/issue' ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <Ticket className="h-6 w-6" />
          <span className="text-xs mt-1">Issue</span>
          <div className="bg-gray-200 rounded-full w-24 h-24 absolute z-[-1] top-[50%] translate-y-[-50%] border border-gray-400"></div>
        </Link>
        <Link href="/admin/users" className={`flex flex-col items-center py-2 px-4 ${
          pathname === '/admin/users' ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <Users className="h-6 w-6" />
          <span className="text-xs mt-1">Users</span>
        </Link>
      </nav>
    </div>
  );
};

export default AdminMenuPanel;