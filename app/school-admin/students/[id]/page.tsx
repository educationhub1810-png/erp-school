import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { ArrowLeft, GraduationCap, User, MapPin, Phone, BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b last:border-0">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

export default async function StudentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { schoolId } = getUser(session);
  if (!schoolId) redirect("/login");

  const { id } = await params;

  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      user: { select: { email: true, mobile: true, isActive: true } },
      parent: true,
    },
  });

  if (!student) notFound();

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  const initials = [student.firstName[0], student.lastName[0]].join("").toUpperCase();

  const address = [student.addressLine1, student.addressLine2, student.city, student.state, student.zipCode, student.country]
    .filter(Boolean).join(", ");

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/school-admin/students" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Profile</h1>
          <p className="text-xs text-gray-500">{student.studentCode}</p>
        </div>
      </div>

      {/* Identity card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {student.photoUrl && <AvatarImage src={student.photoUrl} alt={fullName} />}
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-gray-900">{fullName}</p>
              <p className="text-sm text-gray-500">
                {student.class.name}{student.section ? ` - ${student.section.name}` : ""}
                {student.rollNumber && ` · Roll ${student.rollNumber}`}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className={student.user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                  {student.user.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="capitalize text-xs">{student.gender.toLowerCase()}</Badge>
                {student.bloodGroup && <Badge variant="outline" className="text-xs">{student.bloodGroup}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Row label="Student Code" value={student.studentCode} />
            <Row label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : null} />
            <Row label="Gender" value={student.gender} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row label="Category" value={student.category} />
            <Row label="Religion" value={student.religion} />
            <Row label="Aadhaar" value={student.aadhaar} />
            <Row label="RFID Number" value={student.rfidNumber} />
          </CardContent>
        </Card>

        {/* Academic info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" /> Academic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Row label="Class" value={`${student.class.name}${student.section ? ` - ${student.section.name}` : ""}`} />
            <Row label="Roll Number" value={student.rollNumber} />
            <Row label="Admission Date" value={new Date(student.admissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} />
            <Row label="Previous School" value={student.previousSchool} />
            <Row label="Email" value={student.user.email} />
            <Row label="Mobile" value={student.user.mobile} />
          </CardContent>
        </Card>

        {/* Address */}
        {address && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" /> Address
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <Row label="Address Line 1" value={student.addressLine1} />
              <Row label="Address Line 2" value={student.addressLine2} />
              <Row label="City" value={student.city} />
              <Row label="State" value={student.state} />
              <Row label="Zip Code" value={student.zipCode} />
              <Row label="Country" value={student.country} />
            </CardContent>
          </Card>
        )}

        {/* Parent info */}
        {student.parent && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" /> Parent / Guardian
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <Row label="Father Name" value={student.parent.fatherName} />
              <Row label="Father Mobile" value={student.parent.fatherMobile} />
              <Row label="Father Email" value={student.parent.fatherEmail} />
              <Row label="Mother Name" value={student.parent.motherName} />
              <Row label="Mother Mobile" value={student.parent.motherMobile} />
              <Row label="Guardian Name" value={student.parent.guardianName} />
              <Row label="Guardian Mobile" value={student.parent.guardianMobile} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
