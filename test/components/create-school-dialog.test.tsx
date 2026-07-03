import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateSchoolDialog } from "@/app/super-admin/schools/create-school-dialog";

function submitButton() {
  return screen.getAllByRole("button", { name: /create school/i }).find((b) => b.getAttribute("type") === "submit")!;
}

describe("CreateSchoolDialog", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("opens the form from the trigger", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolDialog />);
    await user.click(screen.getByRole("button", { name: /add school/i }));
    expect(screen.getByPlaceholderText(/delhi public school/i)).toBeInTheDocument();
  });

  it("blocks non-digit keystrokes in the phone field", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolDialog />);
    await user.click(screen.getByRole("button", { name: /add school/i }));
    const phone = screen.getByPlaceholderText("9876543210");
    await user.type(phone, "abc123def");
    expect(phone).toHaveValue("123");
  });

  it("shows a validation error for an invalid phone number", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolDialog />);
    await user.click(screen.getByRole("button", { name: /add school/i }));
    await user.type(screen.getByPlaceholderText(/delhi public school/i), "Greenwood High");
    const phone = screen.getByPlaceholderText("9876543210");
    await user.click(phone);
    await user.paste("12345");
    await user.click(submitButton());

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("previews an uploaded logo and allows removing it", async () => {
    const user = userEvent.setup();
    render(<CreateSchoolDialog />);
    await user.click(screen.getByRole("button", { name: /add school/i }));

    const file = new File(["logo-bytes"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const preview = await screen.findByAltText(/school logo/i);
    expect(preview).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByAltText(/school logo/i)).not.toBeInTheDocument();
  });

  it("rejects a non-image file for the logo", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    render(<CreateSchoolDialog />);
    await user.click(screen.getByRole("button", { name: /add school/i }));

    const file = new File(["not-an-image"], "doc.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(toast.error).toHaveBeenCalledWith("Please select an image file");
    expect(screen.queryByAltText(/school logo/i)).not.toBeInTheDocument();
  });
});
