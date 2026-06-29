import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EditParentDialog, type EditableParent } from "@/app/super-admin/parents/edit-parent-dialog";

const parent: EditableParent = {
  id: "parent-1",
  name: "Ramesh Verma",
  email: "ramesh@example.com",
  mobile: "9876543210",
  isActive: true,
  school: { name: "Greenwood High", code: "GWH" },
  parentProfile: {
    parentCode: "G-PAR00001",
    parentType: "FATHER",
    firstName: "Ramesh",
    middleName: null,
    lastName: "Verma",
    gender: "MALE",
    dob: null,
    maritalStatus: null,
    nationality: null,
    aadhaar: null,
    pan: null,
    address: null,
    student: null,
  },
};

describe("EditParentDialog", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders pre-filled with the parent's current details", () => {
    render(<EditParentDialog parent={parent} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Ramesh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Verma")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when First Name is cleared", async () => {
    const user = userEvent.setup();
    render(<EditParentDialog parent={parent} open={true} onOpenChange={vi.fn()} />);

    await user.clear(screen.getByDisplayValue("Ramesh"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks non-digit keystrokes in the mobile field", async () => {
    const user = userEvent.setup();
    render(<EditParentDialog parent={parent} open={true} onOpenChange={vi.fn()} />);

    const mobile = screen.getByDisplayValue("9876543210");
    await user.clear(mobile);
    await user.type(mobile, "abc123def");
    expect(mobile).toHaveValue("123");
  });

  it("submits a PUT to /api/v1/parents/[id] with the edited fields", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<EditParentDialog parent={parent} open={true} onOpenChange={onOpenChange} />);

    const lastName = screen.getByDisplayValue("Verma");
    await user.clear(lastName);
    await user.type(lastName, "Sharma");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/parents/parent-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.lastName).toBe("Sharma");

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
