import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateSchoolAdminDialog } from "@/app/super-admin/school-admins/create-school-admin-dialog";

const schools = [{ id: "school-1", name: "Delhi Public School", code: "SCH001" }];

// The school Select is a base-ui combobox; clicking it doesn't reliably open
// the popup in jsdom (no real layout/pointer capture), but keyboard
// interaction does: focus + Enter opens it, a second Enter picks the
// (single, already-highlighted) option.
async function selectOnlySchool(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("combobox").focus();
  await user.keyboard("{Enter}");
  await user.keyboard("{Enter}");
}

// Once the dialog is open, the outer "+ Add School Admin" trigger becomes
// `aria-hidden` (inert behind the modal) — but exactly when that lands isn't
// consistent in jsdom, so querying by index among same-named buttons is
// flaky. The submit button is the only one with type="submit".
function submitButton(): HTMLElement {
  return screen.getAllByRole("button", { name: /add school admin/i }).find((b) => b.getAttribute("type") === "submit")!;
}

describe("CreateSchoolAdminDialog", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { name: "Anita Desai", email: "anita@sch001.com" },
          defaultPassword: "Scho@123",
        },
      }),
    }) as never;
  });

  it("renders an Add School Admin trigger that opens the form", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolAdminDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add school admin/i }));
    expect(screen.getByText("School *")).toBeInTheDocument();
    expect(screen.getByText("Name *")).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolAdminDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add school admin/i }));
    await user.click(submitButton());

    expect(await screen.findByText(/school is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requires an email or mobile", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolAdminDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add school admin/i }));
    await selectOnlySchool(user);
    await user.type(screen.getByPlaceholderText("Anita Desai"), "Anita Desai");
    await user.click(submitButton());

    expect(await screen.findByText(/email or mobile is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits with role SCHOOL_ADMIN to /api/v1/users and shows the login ID + temporary password", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolAdminDialog schools={schools} />);
    await user.click(screen.getByRole("button", { name: /add school admin/i }));
    await selectOnlySchool(user);
    await user.type(screen.getByPlaceholderText("Anita Desai"), "Anita Desai");
    await user.type(screen.getByPlaceholderText("admin@school.com"), "anita@sch001.com");
    await user.click(submitButton());

    expect(await screen.findByText(/login details/i)).toBeInTheDocument();
    expect(screen.getByText("anita@sch001.com")).toBeInTheDocument();
    expect(screen.getByText("Scho@123")).toBeInTheDocument();

    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/users");
    const body = JSON.parse(opts.body);
    expect(body.role).toBe("SCHOOL_ADMIN");
    expect(body.schoolId).toBe("school-1");
    expect(body.name).toBe("Anita Desai");
  });
});
