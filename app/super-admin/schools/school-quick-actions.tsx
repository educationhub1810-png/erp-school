"use client";

import { GraduationCap, UserCheck, UserCog } from "lucide-react";
import { CreateStudentDialog } from "../students/create-student-dialog";
import { CreateTeacherDialog } from "../teachers/create-teacher-dialog";
import { CreateStaffDialog } from "../_staff/create-staff-dialog";

interface Props {
  school: { id: string; name: string; code: string; principalName?: string | null };
}

export function SchoolQuickActions({ school }: Props) {
  const schools = [school];

  return (
    <div className="flex items-center gap-1">
      <CreateStudentDialog
        schools={schools}
        defaultSchoolId={school.id}
        triggerContent={<span title={`Add Student to ${school.name}`}><GraduationCap className="w-4 h-4" /></span>}
      />
      <CreateTeacherDialog
        schools={schools}
        defaultSchoolId={school.id}
        triggerContent={<span title={`Add Teacher to ${school.name}`}><UserCheck className="w-4 h-4" /></span>}
      />
      <CreateStaffDialog
        role="PRINCIPAL"
        roleLabel="Principal"
        schools={schools}
        defaultSchoolId={school.id}
        triggerContent={<span title={`Add Principal to ${school.name}`}><UserCog className="w-4 h-4" /></span>}
      />
    </div>
  );
}
