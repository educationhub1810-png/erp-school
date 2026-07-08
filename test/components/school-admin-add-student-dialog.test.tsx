import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AddStudentDialog } from "@/app/school-admin/students/add-student-dialog";

const classes = [{ id: "class-1", name: "Class 10", sections: [{ id: "section-1", name: "A" }] }];

function nextButton() {
  return screen.getByRole("button", { name: /^next$/i });
}

// Labels in this dialog aren't programmatically associated with their inputs
// (no htmlFor/id) — find the input within the same field wrapper as its label.
function inputForLabel(text: string | RegExp): HTMLInputElement {
  return screen.getByText(text).closest("div")!.querySelector("input") as HTMLInputElement;
}

async function selectOnlyClass(user: ReturnType<typeof userEvent.setup>) {
  // Class renders before Section/House in the DOM.
  await user.click(screen.getAllByRole("combobox")[0]);
  await user.click(await screen.findByRole("option", { name: classes[0].name }));
}

async function fillPersonalStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(inputForLabel("First Name *"), "Asha");
  await user.type(inputForLabel("Last Name *"), "Rao");
  await user.click(screen.getByRole("button", { name: /select date of birth/i }));
  await user.click(await screen.findByRole("button", { name: /go to the previous month/i }));
  await user.click(await screen.findByText("15", { exact: true }));
}

describe("AddStudentDialog (school-admin)", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { studentCode: "V-STD00001", dob: "2010-05-15" } }),
    }) as never;
  });

  it("renders the trigger and opens to the Personal step", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));
    expect(screen.getByText("Add New Student")).toBeInTheDocument();
    expect(screen.getByText("First Name *")).toBeInTheDocument();
  });

  it("blocks advancing past the Personal step when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));
    await user.click(nextButton());

    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
    // Still on the Personal step — Academic-only fields aren't rendered yet.
    expect(screen.queryByText(/select class/i)).not.toBeInTheDocument();
  });

  it("does not render House or Medical Notes fields on the Academic step", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    await fillPersonalStep(user);
    await user.click(nextButton());
    await screen.findByText("Roll Number");

    expect(screen.queryByText("House")).not.toBeInTheDocument();
    expect(screen.queryByText("Medical Notes")).not.toBeInTheDocument();
  });

  it("walks through all 4 steps and submits split address fields plus parent details, showing the student code + DOB password", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    // Step 1: Personal
    await fillPersonalStep(user);
    await user.click(nextButton());

    // Step 2: Academic
    await screen.findByText("Roll Number");
    await selectOnlyClass(user);
    await user.click(nextButton());

    // Step 3: Contact
    await screen.findByText("Address Line 1");
    await user.type(inputForLabel("Address Line 1"), "221B Baker Street");
    await user.type(inputForLabel("City"), "New Delhi");
    await user.type(inputForLabel("Zip Code"), "110001");
    await user.click(nextButton());

    // Step 4: Parents
    await screen.findByText("Father's Name");
    await user.type(inputForLabel("Father's Name"), "Ramesh Rao");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/students");
    const body = JSON.parse(init.body as string);
    expect(body.schoolId).toBe("school-1");
    expect(body.firstName).toBe("Asha");
    expect(body.lastName).toBe("Rao");
    expect(body.classId).toBe("class-1");
    expect(body.addressLine1).toBe("221B Baker Street");
    expect(body.city).toBe("New Delhi");
    expect(body.zipCode).toBe("110001");
    expect(body.country).toBe("India");
    expect(body.house).toBeUndefined();
    expect(body.medicalNotes).toBeUndefined();
    expect(body.fatherName).toBe("Ramesh Rao");

    expect(await screen.findByText(/student added successfully/i)).toBeInTheDocument();
    const credentialsDialog = screen.getByRole("dialog", { name: /student added successfully/i });
    expect(within(credentialsDialog).getByText("V-STD00001")).toBeInTheDocument();
  }, 15000);

  it("does not require any Parents step field to submit", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    await fillPersonalStep(user);
    await user.click(nextButton());
    await screen.findByText("Roll Number");
    await selectOnlyClass(user);
    await user.click(nextButton());
    await screen.findByText("Address Line 1");
    await user.click(nextButton());

    await screen.findByText("Father's Name");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.fatherName).toBeFalsy();
  }, 15000);

  it("rejects a malformed mobile number on the Contact step", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    await fillPersonalStep(user);
    await user.click(nextButton());
    await screen.findByText("Roll Number");
    await selectOnlyClass(user);
    await user.click(nextButton());
    await screen.findByText("Address Line 1");

    await user.type(inputForLabel("Mobile"), "12345");
    await user.click(nextButton());
    await screen.findByText("Father's Name");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  }, 15000);

  it("rejects a malformed zip code on the Contact step", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    await fillPersonalStep(user);
    await user.click(nextButton());
    await screen.findByText("Roll Number");
    await selectOnlyClass(user);
    await user.click(nextButton());
    await screen.findByText("Address Line 1");

    await user.type(inputForLabel("Zip Code"), "123");
    await user.click(nextButton());
    await screen.findByText("Father's Name");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(await screen.findByText(/valid 6-digit pin code/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  }, 15000);

  it("rejects a malformed father's mobile number on the Parents step", async () => {
    const user = userEvent.setup();
    render(<AddStudentDialog classes={classes} schoolId="school-1" schoolName="Vidyapeeth School" />);
    await user.click(screen.getByRole("button", { name: /^add student$/i }));

    await fillPersonalStep(user);
    await user.click(nextButton());
    await screen.findByText("Roll Number");
    await selectOnlyClass(user);
    await user.click(nextButton());
    await screen.findByText("Address Line 1");
    await user.click(nextButton());

    await user.type(inputForLabel("Father's Mobile"), "12345");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  }, 15000);
});
