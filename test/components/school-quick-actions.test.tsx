import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SchoolQuickActions } from "@/app/super-admin/schools/school-quick-actions";

const school = { id: "school-1", name: "Delhi Public School", code: "SCH001", principalName: "Dr. Ramesh Sharma", isActive: true };

describe("SchoolQuickActions", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) }) as never;
  });

  it("opens the Add Student dialog with this school pre-selected", async () => {
    const user = userEvent.setup();
    render(<SchoolQuickActions school={school} />);
    await user.click(screen.getByTitle(`Add Student to ${school.name}`));
    const dialog = within(screen.getByRole("dialog", { name: /add new student/i }));
    expect(dialog.getByText(/personal/i)).toBeInTheDocument();
    expect(dialog.getByText("Delhi Public School (SCH001)")).toBeInTheDocument();
  });

  it("opens the Add Teacher dialog with this school pre-selected", async () => {
    const user = userEvent.setup();
    render(<SchoolQuickActions school={school} />);
    await user.click(screen.getByTitle(`Add Teacher to ${school.name}`));
    const dialog = within(screen.getByRole("dialog", { name: /add new teacher/i }));
    expect(dialog.getByText("Delhi Public School (SCH001)")).toBeInTheDocument();
  });

  it("opens the Add Principal dialog with this school pre-selected and auto-fills the principal's name", async () => {
    const user = userEvent.setup();
    render(<SchoolQuickActions school={school} />);
    await user.click(screen.getByTitle(`Add Principal to ${school.name}`));
    const dialog = within(screen.getByRole("dialog", { name: /add new principal/i }));
    expect(dialog.getByText("Delhi Public School (SCH001)")).toBeInTheDocument();
    expect(dialog.getByDisplayValue("Dr. Ramesh Sharma")).toBeInTheDocument();
  });

  it("disables all three quick-add triggers for an inactive school", async () => {
    const user = userEvent.setup();
    render(<SchoolQuickActions school={{ ...school, isActive: false }} />);

    const studentTrigger = screen.getByTitle(`Add Student to ${school.name} (enable the school first)`);
    const teacherTrigger = screen.getByTitle(`Add Teacher to ${school.name} (enable the school first)`);
    const principalTrigger = screen.getByTitle(`Add Principal to ${school.name} (enable the school first)`);

    expect(studentTrigger.closest("button")).toBeDisabled();
    expect(teacherTrigger.closest("button")).toBeDisabled();
    expect(principalTrigger.closest("button")).toBeDisabled();

    await user.click(studentTrigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
