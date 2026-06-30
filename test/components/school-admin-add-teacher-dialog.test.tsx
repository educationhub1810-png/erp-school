import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AddTeacherDialog } from "@/app/school-admin/teachers/add-teacher-dialog";

// Labels in this dialog aren't programmatically associated with their inputs
// (no htmlFor/id) — find the input within the same field wrapper as its label.
function inputForLabel(text: string | RegExp): HTMLInputElement {
  return screen.getByText(text).closest("div")!.querySelector("input") as HTMLInputElement;
}

async function fillNameAndDob(user: ReturnType<typeof userEvent.setup>) {
  await user.type(inputForLabel("Full Name *"), "Priya Singh");
  await user.click(screen.getByRole("button", { name: /select date of birth/i }));
  await user.click(screen.getByText("15", { exact: true }));
}

describe("AddTeacherDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { employeeId: "V-TCH00001", dob: "1990-05-15" } }),
    }) as never;
  });

  it("renders the trigger, opens the form, and shows the auto-generated code preview", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));
    expect(screen.getByText("Add New Teacher")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/auto-generated.*V-TCH00001/i)).toBeInTheDocument();
  });

  it("does not render Account Number or IFSC Code fields", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));
    expect(screen.queryByText("Account Number")).not.toBeInTheDocument();
    expect(screen.queryByText("IFSC Code")).not.toBeInTheDocument();
  });

  it("shows a validation error when the name is empty", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));
    await user.click(screen.getByRole("button", { name: /save teacher/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks submitting without a date of birth", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));

    await user.type(inputForLabel("Full Name *"), "Priya Singh");
    await user.click(screen.getByRole("button", { name: /save teacher/i }));

    expect(await screen.findByText(/date of birth is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a malformed mobile number", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));

    await fillNameAndDob(user);
    await user.type(inputForLabel("Mobile"), "12345");
    await user.click(screen.getByRole("button", { name: /save teacher/i }));

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits to /api/v1/teachers and shows the teacher code + DOB password on success", async () => {
    const user = userEvent.setup();
    render(<AddTeacherDialog schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add teacher$/i }));

    await fillNameAndDob(user);
    await user.click(screen.getByRole("button", { name: /save teacher/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/teachers");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Priya Singh");
    expect(body.dob).toBeTruthy();
    expect(body.employeeId).toBeUndefined();
    expect(body.schoolId).toBeUndefined();
    expect(body.accountNumber).toBeUndefined();
    expect(body.ifscCode).toBeUndefined();

    expect(await screen.findByText(/teacher added successfully/i)).toBeInTheDocument();
    const credentialsDialog = screen.getByRole("dialog", { name: /teacher added successfully/i });
    expect(within(credentialsDialog).getByText("V-TCH00001")).toBeInTheDocument();
  });
});
