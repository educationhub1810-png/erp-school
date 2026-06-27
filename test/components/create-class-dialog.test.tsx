import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateClassDialog } from "@/app/school-admin/classes/create-class-dialog";

function submitButton() {
  return screen.getAllByRole("button", { name: /add class/i }).find((b) => b.getAttribute("type") === "submit")!;
}

describe("CreateClassDialog", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("renders the trigger and opens the form", async () => {
    const user = userEvent.setup();
    render(<CreateClassDialog />);
    await user.click(screen.getByRole("button", { name: /add class/i }));
    expect(screen.getByPlaceholderText(/nursery, jr\. kg/i)).toBeInTheDocument();
  });

  it("shows a validation error when the name is empty", async () => {
    const user = userEvent.setup();
    render(<CreateClassDialog />);
    await user.click(screen.getByRole("button", { name: /add class/i }));
    await user.click(submitButton());
    expect(await screen.findByText(/class name is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits the class name to /api/v1/classes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: "class-new", name: "Nursery" } }),
    });
    const user = userEvent.setup();
    render(<CreateClassDialog />);
    await user.click(screen.getByRole("button", { name: /add class/i }));
    await user.type(screen.getByPlaceholderText(/nursery, jr\. kg/i), "Nursery");
    await user.click(submitButton());

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/classes",
      expect.objectContaining({ method: "POST" }),
    ));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.name).toBe("Nursery");
  });

  it("shows the server's error message on failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Class name is required" }),
    });
    const user = userEvent.setup();
    render(<CreateClassDialog />);
    await user.click(screen.getByRole("button", { name: /add class/i }));
    await user.type(screen.getByPlaceholderText(/nursery, jr\. kg/i), "Nursery");
    await user.click(submitButton());

    expect(await screen.findByText("Class name is required")).toBeInTheDocument();
  });
});
