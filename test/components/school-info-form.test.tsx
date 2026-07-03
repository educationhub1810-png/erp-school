import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { School } from "@/lib/generated/prisma/client";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SchoolInfoForm } from "@/app/school-admin/settings/school-info-form";

const school = {
  id: "school-1",
  name: "Greenwood High",
  code: "GWH",
  principalName: "Dr. Sharma",
  email: "admin@greenwood.edu",
  phone: "9876543210",
  address: "123 Main St",
  city: "Delhi",
  state: "Delhi",
  country: "India",
  timezone: "Asia/Kolkata",
  currency: "INR",
  regNumber: "REG123",
  affiliationNumber: "AFF456",
} as unknown as School;

describe("SchoolInfoForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) }) as never;
  });

  it("renders pre-filled with the school's current details", () => {
    render(<SchoolInfoForm school={school} />);
    expect(screen.getByDisplayValue("Greenwood High")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
  });

  it("blocks non-digit keystrokes in the phone field", async () => {
    const user = userEvent.setup();
    render(<SchoolInfoForm school={school} />);

    const phone = screen.getByDisplayValue("9876543210");
    await user.clear(phone);
    await user.type(phone, "abc123def");
    expect(phone).toHaveValue("123");
  });

  it("shows a validation error and does not submit when name is cleared", async () => {
    const user = userEvent.setup();
    render(<SchoolInfoForm school={school} />);

    await user.clear(screen.getByDisplayValue("Greenwood High"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a PUT to /api/v1/schools/[id] with the edited fields", async () => {
    const user = userEvent.setup();
    render(<SchoolInfoForm school={school} />);

    const principal = screen.getByDisplayValue("Dr. Sharma");
    await user.clear(principal);
    await user.type(principal, "Dr. Mehta");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/schools/school-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.principalName).toBe("Dr. Mehta");

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });

  it("previews an uploaded logo and allows removing it", async () => {
    const user = userEvent.setup();
    render(<SchoolInfoForm school={school} />);

    const file = new File(["logo-bytes"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const preview = await screen.findByAltText(/school logo/i);
    expect(preview).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByAltText(/school logo/i)).not.toBeInTheDocument();
  });

  it("rejects a non-image file for the logo", async () => {
    const { toast } = await import("sonner");
    render(<SchoolInfoForm school={school} />);

    const file = new File(["not-an-image"], "doc.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(toast.error).toHaveBeenCalledWith("Please select an image file");
    expect(screen.queryByAltText(/school logo/i)).not.toBeInTheDocument();
  });
});
