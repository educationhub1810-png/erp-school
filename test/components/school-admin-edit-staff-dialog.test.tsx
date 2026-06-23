import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EditStaffDialog, type EditableStaff } from "@/app/school-admin/staff/edit-staff-dialog";

const staff: EditableStaff = {
  id: "staff-1",
  employeeId: "ACC001",
  department: "Finance & Accounts",
  designation: "Accountant",
  joiningDate: "2019-06-01",
  salary: 30000,
  pan: null,
  aadhaar: null,
  bankName: null,
  accountNumber: null,
  ifscCode: null,
  qualification: "B.Com, CA",
  experienceYears: 9,
  licenseNumber: null,
  vehicleNumber: null,
  assignedBlock: null,
  user: { name: "Rekha Gupta", email: "accountant@sch001.com", mobile: null, isActive: true },
};

describe("EditStaffDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders pre-filled with the staff member's current details", () => {
    render(<EditStaffDialog role="ACCOUNTANT" roleLabel="Accountant" staff={staff} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Rekha Gupta")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Finance & Accounts")).toBeInTheDocument();
    expect(screen.getByText(/ACC001/)).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when Name is cleared", async () => {
    const user = userEvent.setup();
    render(<EditStaffDialog role="ACCOUNTANT" roleLabel="Accountant" staff={staff} open={true} onOpenChange={vi.fn()} />);

    await user.clear(screen.getByDisplayValue("Rekha Gupta"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a PUT to /api/v1/staff/[id] with the edited fields", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<EditStaffDialog role="ACCOUNTANT" roleLabel="Accountant" staff={staff} open={true} onOpenChange={onOpenChange} />);

    const department = screen.getByDisplayValue("Finance & Accounts");
    await user.clear(department);
    await user.type(department, "Accounts Payable");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/staff/staff-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.department).toBe("Accounts Payable");

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
