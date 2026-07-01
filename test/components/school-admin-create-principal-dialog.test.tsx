import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreatePrincipalDialog } from "@/app/school-admin/principals/create-principal-dialog";

function inputForLabel(text: string | RegExp): HTMLInputElement {
  return screen.getByText(text).closest("div")!.querySelector("input") as HTMLInputElement;
}

describe("CreatePrincipalDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { employeeId: "V-PRN00001", dob: "1975-06-10" } }),
    }) as never;
  });

  it("renders the trigger, opens the form with a PRN code preview, no school selector", async () => {
    const user = userEvent.setup();
    render(<CreatePrincipalDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add principal$/i }));

    expect(screen.getByText("Add New Principal")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/auto-generated.*V-PRN00001/i)).toBeInTheDocument();
    expect(screen.queryByText("School *")).not.toBeInTheDocument();
  });

  it("pre-fills the name from principalName prop", async () => {
    const user = userEvent.setup();
    render(<CreatePrincipalDialog schoolName="Vidyapeeth School" principalName="Dr. Ramesh Sharma" />);
    await user.click(screen.getByRole("button", { name: /^add principal$/i }));
    expect(screen.getByDisplayValue("Dr. Ramesh Sharma")).toBeInTheDocument();
  });

  it("blocks submitting without a date of birth", async () => {
    const user = userEvent.setup();
    render(<CreatePrincipalDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add principal$/i }));

    await user.type(inputForLabel("Full Name *"), "Dr. Ramesh Sharma");
    await user.click(screen.getByRole("button", { name: /save principal/i }));

    expect(await screen.findByText(/date of birth is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits to /api/v1/staff with role=PRINCIPAL and shows the code + DOB password", async () => {
    const user = userEvent.setup();
    render(<CreatePrincipalDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add principal$/i }));

    await user.type(inputForLabel("Full Name *"), "Dr. Ramesh Sharma");
    await user.click(screen.getByRole("button", { name: /select date of birth/i }));
    // Navigate to previous month so day 10 is not a future date
    await user.click(await screen.findByRole("button", { name: /go to the previous month/i }));
    await user.click(await screen.findByText("10", { exact: true }));
    await user.click(screen.getByRole("button", { name: /save principal/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/staff");
    const body = JSON.parse(init.body as string);
    expect(body.role).toBe("PRINCIPAL");
    expect(body.name).toBe("Dr. Ramesh Sharma");
    expect(body.dob).toBeTruthy();
    expect(body.schoolId).toBeUndefined();

    expect(await screen.findByText(/principal added successfully/i)).toBeInTheDocument();
    const credentialsDialog = screen.getByRole("dialog", { name: /principal added successfully/i });
    expect(within(credentialsDialog).getByText("V-PRN00001")).toBeInTheDocument();
    expect(within(credentialsDialog).getByText(/10061975/)).toBeInTheDocument();
  }, 15000);
});
