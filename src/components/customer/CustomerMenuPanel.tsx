'use client'

import React from 'react';
import { usePathname } from 'next/navigation';
import { DiscAlbum } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProgramStore } from '@/store/programStore';

const CustomerMenuPanel: React.FC = () => {
  const pathname = usePathname();
  const { userJoinedPrograms } = useProgramStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg md:hidden z-50 border-t border-gray-300">
      <nav className="flex justify-around items-center gap-4 p-4">
        <span>
          <DiscAlbum className="h-6 w-6 stroke-gray-600" />
        </span>
        <Select>
          <SelectTrigger className="h-12 border-gray-400">
            <SelectValue placeholder="Select a program" />
          </SelectTrigger>
          <SelectContent>
            {userJoinedPrograms.map((program) => (
              <SelectItem key={program.programId} value={program.programId} className="h-12">{program.programName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
       
      </nav>
    </div>
  );
};

export default CustomerMenuPanel;