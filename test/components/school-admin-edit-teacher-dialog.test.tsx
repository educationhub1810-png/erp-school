import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EditTeacherDialog, type EditableTeacher } from "@/app/school-admin/teachers/edit-teacher-dialog";

const teacher: EditableTeacher = {
  id: "teacher-1",
  gender: "FEMALE",
  qualification: "B.Ed",
  experienceYears: 5,
  specialization: "Mathematics",
  salary: 35000,
  pan: null,
  aadhaar: null,
  bankName: null,
  accountNumber: null,
  ifscCode: null,
  user: { name: "Priya Singh", email: "priya@sch001.com", mobile: null },
};

describe("EditTeacherDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders pre-filled with the teacher's current details", () => {
    render(<EditTeacherDialog teacher={teacher} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Priya Singh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mathematics")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when Name is cleared", async () => {
    const user = userEvent.setup();
    render(<EditTeacherDialog teacher={teacher} open={true} onOpenChange={vi.fn()} />);

    await user.clear(screen.getByDisplayValue("Priya Singh"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a PUT to /api/v1/teachers/[id] with the edited fields", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<EditTeacherDialog teacher={teacher} open={true} onOpenChange={onOpenChange} />);

    const specialization = screen.getByDisplayValue("Mathematics");
    await user.clear(specialization);
    await user.type(specialization, "Physics");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/teachers/teacher-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.specialization).toBe("Physics");

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
