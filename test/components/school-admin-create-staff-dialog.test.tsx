import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateStaffDialog } from "@/app/school-admin/staff/create-staff-dialog";

function inputForLabel(text: string | RegExp): HTMLInputElement {
  return screen.getByText(text).closest("div")!.querySelector("input") as HTMLInputElement;
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  render(<CreateStaffDialog />);
  await user.click(screen.getByRole("button", { name: /^add staff$/i }));
}

async function selectRole(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("CreateStaffDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { employeeId: "V-PRN00001", dob: "1985-04-10" } }),
    }) as never;
  });

  it("defaults to Accountant, requiring an Employee ID", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    expect(screen.getByText("Employee ID *")).toBeInTheDocument();
  });

  it("switching to Principal shows the auto-code preview and a required Date of Birth field instead of Employee ID", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await selectRole(user, "Principal");

    expect(screen.getByDisplayValue(/auto-generated.*PRN00001/i)).toBeInTheDocument();
    expect(screen.queryByText("Employee ID *")).not.toBeInTheDocument();
    expect(screen.getByText("Date of Birth *")).toBeInTheDocument();
  });

  it("blocks submitting a Principal without a date of birth", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await selectRole(user, "Principal");

    await user.type(inputForLabel("Full Name *"), "Dr. Ramesh Sharma");
    await user.click(screen.getByRole("button", { name: /save principal/i }));

    expect(await screen.findByText(/date of birth is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a Principal with DOB and shows the code + DOB password on success", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await selectRole(user, "Principal");

    await user.type(inputForLabel("Full Name *"), "Dr. Ramesh Sharma");
    await user.click(screen.getByRole("button", { name: /select date of birth/i }));
    await user.click(await screen.findByRole("button", { name: /go to the previous month/i }));
    await user.click(await screen.findByText("10", { exact: true }));
    await user.click(screen.getByRole("button", { name: /save principal/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/staff");
    const body = JSON.parse(init.body as string);
    expect(body.role).toBe("PRINCIPAL");
    expect(body.dob).toBeTruthy();

    expect(await screen.findByText(/principal added successfully/i)).toBeInTheDocument();
    const credentialsDialog = screen.getByRole("dialog", { name: /principal added successfully/i });
    expect(within(credentialsDialog).getByText("V-PRN00001")).toBeInTheDocument();
    expect(within(credentialsDialog).getByText(/10041985/)).toBeInTheDocument();
  }, 15000);

  it("does not require DOB for non-Principal roles like Accountant", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(inputForLabel("Full Name *"), "Anita Verma");
    await user.type(inputForLabel("Employee ID *"), "EMP2025007");
    await user.click(screen.getByRole("button", { name: /save accountant/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.role).toBe("ACCOUNTANT");
  });
});
