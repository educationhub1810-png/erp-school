import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateParentDialog } from "@/app/school-admin/parents/create-parent-dialog";

const classes = [{ id: "class-1", name: "Class 10" }];
const students = [{ id: "student-1", firstName: "Asha", lastName: "Rao", studentCode: "V-STD00001" }];

async function selectClass(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("combobox")[0]);
  await user.click(await screen.findByRole("option", { name: classes[0].name }));
}

async function selectStudent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("combobox")[1]);
  await user.click(await screen.findByRole("option", { name: /Asha Rao/i }));
}

describe("CreateParentDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn((url: string) => {
      if (typeof url === "string" && url.startsWith("/api/v1/students")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { students } }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { accounts: [{ role: "father", name: "Ramesh Rao", parentCode: "V-PAR00001", dob: null }] },
        }),
      });
    }) as never;
  });

  it("renders the trigger and opens the dialog", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schoolId="school-1" schoolName="Vidyapeeth School" classes={classes} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    expect(screen.getByText("Add New Parent Account")).toBeInTheDocument();
    // No School select rendered for school-admin.
    expect(screen.queryByText(/^school \*/i)).not.toBeInTheDocument();
  });

  it("reveals father fields once included", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schoolId="school-1" schoolName="Vidyapeeth School" classes={classes} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    await user.click(screen.getByText(/father details/i));
    expect(screen.getAllByText(/first name/i)[0]).toBeInTheDocument();
  });

  it("requires at least one of father/mother/guardian and required sub-fields when included", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schoolId="school-1" schoolName="Vidyapeeth School" classes={classes} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));

    // Submitting with nothing included shows the "include at least one" error.
    await user.click(screen.getByRole("button", { name: /save parent/i }));
    expect(await screen.findByText(/include at least one of father, mother, or guardian/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    // Including Father without filling required fields shows field-level errors.
    await user.click(screen.getByText(/father details/i));
    await user.click(screen.getByRole("button", { name: /save parent/i }));
    expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits the right payload to /api/v1/parents with schoolId, studentId, and father details", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schoolId="school-1" schoolName="Vidyapeeth School" classes={classes} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));

    await selectClass(user);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/v1/students?classId=class-1&limit=100"));
    await selectStudent(user);

    await user.click(screen.getByText(/father details/i));
    const firstName = screen.getAllByText(/^first name \*/i)[0].closest("div")!.querySelector("input")!;
    const lastName = screen.getAllByText(/^last name \*/i)[0].closest("div")!.querySelector("input")!;
    await user.type(firstName, "Ramesh");
    await user.type(lastName, "Rao");

    // Gender select for the father section is the 3rd combobox (class, student, gender).
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[2]);
    await user.click(await screen.findByRole("option", { name: "Male" }));

    await user.click(screen.getByRole("button", { name: /save parent/i }));

    await waitFor(() => {
      const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[1]?.method === "POST"
      );
      expect(postCall).toBeTruthy();
    });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[1]?.method === "POST"
    )!;
    expect(postCall[0]).toBe("/api/v1/parents");
    const body = JSON.parse(postCall[1].body as string);
    expect(body.schoolId).toBe("school-1");
    expect(body.studentId).toBe("student-1");
    expect(body.father.firstName).toBe("Ramesh");
    expect(body.father.lastName).toBe("Rao");
    expect(body.father.gender).toBe("MALE");
    expect(body.mother).toBeUndefined();
    expect(body.guardian).toBeUndefined();

    expect(await screen.findByText(/parent account\(s\) added successfully/i)).toBeInTheDocument();
  }, 15000);

  it("blocks non-digit keystrokes in the father's mobile field", async () => {
    const user = userEvent.setup();
    render(<CreateParentDialog schoolId="school-1" schoolName="Vidyapeeth School" classes={classes} />);
    await user.click(screen.getByRole("button", { name: /add parent/i }));
    await user.click(screen.getByText(/father details/i));
    const mobile = screen.getByPlaceholderText("9876543210");
    await user.type(mobile, "abc123def");
    expect(mobile).toHaveValue("123");
  });
});
