import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateStaffDialog } from "@/app/super-admin/_staff/create-staff-dialog";

const schools = [
  { id: "school-1", name: "Delhi Public School", code: "SCH001", principalName: "Dr. Ramesh Sharma" },
  { id: "school-2", name: "Monarch Preschool", code: "SCH003", principalName: null },
];

// The school Select is a base-ui combobox; clicking it doesn't reliably open
// the popup in jsdom, but keyboard interaction does.
async function selectSchool(user: ReturnType<typeof userEvent.setup>, index: number) {
  screen.getByRole("combobox").focus();
  await user.keyboard("{Enter}");
  for (let i = 0; i < index; i++) await user.keyboard("{ArrowDown}");
  await user.keyboard("{Enter}");
}

describe("CreateStaffDialog — Principal name auto-fill from the school record", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("fills Full Name from the school's principalName when a school is picked", async () => {
    const user = userEvent.setup();
    render(<CreateStaffDialog role="PRINCIPAL" roleLabel="Principal" schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add principal/i }));

    await selectSchool(user, 0); // Delhi Public School

    expect(screen.getByDisplayValue("Dr. Ramesh Sharma")).toBeInTheDocument();
  });

  it("does not clobber a name the admin already typed when switching schools", async () => {
    const user = userEvent.setup();
    render(<CreateStaffDialog role="PRINCIPAL" roleLabel="Principal" schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add principal/i }));

    await selectSchool(user, 0); // Delhi Public School -> auto-fills "Dr. Ramesh Sharma"
    const nameInput = screen.getByDisplayValue("Dr. Ramesh Sharma");
    await user.clear(nameInput);
    await user.type(nameInput, "Custom Typed Name");

    await selectSchool(user, 0); // re-pick the same school

    expect(screen.getByDisplayValue("Custom Typed Name")).toBeInTheDocument();
  });

  it("leaves Full Name untouched when the selected school has no principalName on file", async () => {
    const user = userEvent.setup();
    render(<CreateStaffDialog role="PRINCIPAL" roleLabel="Principal" schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add principal/i }));

    await selectSchool(user, 1); // Monarch Preschool, principalName: null

    expect((document.querySelector('input[name="name"]') as HTMLInputElement).value).toBe("");
  });

  it("does not auto-fill for non-Principal roles", async () => {
    const user = userEvent.setup();
    render(<CreateStaffDialog role="ACCOUNTANT" roleLabel="Accountant" schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add accountant/i }));

    await selectSchool(user, 0); // Delhi Public School

    expect(screen.queryByDisplayValue("Dr. Ramesh Sharma")).not.toBeInTheDocument();
  });
});
