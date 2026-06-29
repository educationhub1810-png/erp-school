"use client";

import { GraduationCap, UserCheck, UserCog } from "lucide-react";
import { CreateStudentDialog } from "../students/create-student-dialog";
import { CreateTeacherDialog } from "../teachers/create-teacher-dialog";
import { CreateStaffDialog } from "../_staff/create-staff-dialog";

interface Props {
  school: { id: string; name: string; code: string; principalName?: string | null; isActive: boolean };
}

export function SchoolQuickActions({ school }: Props) {
  const schools = [school];
  const disabled = !school.isActive;
  const titleSuffix = disabled ? " (enable the school first)" : "";

  return (
    <div className="flex items-center gap-1">
      <CreateStudentDialog
        schools={schools}
        defaultSchoolId={school.id}
        disabled={disabled}
        triggerContent={<span title={`Add Student to ${school.name}${titleSuffix}`}><GraduationCap className="w-4 h-4" /></span>}
        triggerClassName="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
      />
      <CreateTeacherDialog
        schools={schools}
        defaultSchoolId={school.id}
        disabled={disabled}
        triggerContent={<span title={`Add Teacher to ${school.name}${titleSuffix}`}><UserCheck className="w-4 h-4" /></span>}
        triggerClassName="border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
      />
      <CreateStaffDialog
        role="PRINCIPAL"
        roleLabel="Principal"
        schools={schools}
        defaultSchoolId={school.id}
        disabled={disabled}
        triggerContent={<span title={`Add Principal to ${school.name}${titleSuffix}`}><UserCog className="w-4 h-4" /></span>}
        triggerClassName="border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
      />
    </div>
  );
}
