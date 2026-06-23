import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EditStudentDialog, type EditableStudent } from "@/app/school-admin/students/edit-student-dialog";

const student: EditableStudent = {
  id: "student-1",
  studentCode: "D-STD00001",
  rollNumber: "12",
  firstName: "Rahul",
  middleName: null,
  lastName: "Verma",
  gender: "MALE",
  dob: "2010-05-01",
  bloodGroup: null,
  category: null,
  religion: null,
  classId: "class-1",
  sectionId: null,
  house: null,
  previousSchool: null,
  transportRequired: false,
  hostelRequired: false,
  medicalNotes: null,
  user: { email: "rahul@sch001.com", mobile: null },
};

const classes = [{ id: "class-1", name: "Class 10", sections: [{ id: "section-1", name: "A" }] }];

describe("EditStudentDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders pre-filled with the student's current details", () => {
    render(<EditStudentDialog student={student} classes={classes} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Rahul")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Verma")).toBeInTheDocument();
    expect(screen.getByText(/D-STD00001/)).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when First Name is cleared", async () => {
    const user = userEvent.setup();
    render(<EditStudentDialog student={student} classes={classes} open={true} onOpenChange={vi.fn()} />);

    const firstName = screen.getByDisplayValue("Rahul");
    await user.clear(firstName);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a PUT to /api/v1/students/[id] with the edited fields", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<EditStudentDialog student={student} classes={classes} open={true} onOpenChange={onOpenChange} />);

    const lastName = screen.getByDisplayValue("Verma");
    await user.clear(lastName);
    await user.type(lastName, "Sharma");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/students/student-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.lastName).toBe("Sharma");

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
