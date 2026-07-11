import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signOutMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next-auth/react", () => ({ signOut: (...a: unknown[]) => signOutMock(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { Header } from "@/components/shared/header";

describe("Header", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    pushMock.mockReset();
  });

  it("renders the user's name and role label", () => {
    render(<Header user={{ name: "Jane Doe", email: "jane@sch001.com", role: "TEACHER" }} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Teacher")).toBeInTheDocument();
  });

  it("navigates to the role's profile page when Profile is clicked", async () => {
    const user = userEvent.setup();
    render(<Header user={{ name: "Jane Doe", email: "jane@sch001.com", role: "TEACHER" }} />);

    await user.click(screen.getByText("Jane Doe"));
    await user.click(await screen.findByText("Profile"));

    expect(pushMock).toHaveBeenCalledWith("/teacher/profile");
  });

  it("navigates to the Super Admin profile path for SUPER_ADMIN", async () => {
    const user = userEvent.setup();
    render(<Header user={{ name: "Nagal", role: "SUPER_ADMIN" }} />);

    await user.click(screen.getByText("Nagal"));
    await user.click(await screen.findByText("Profile"));

    expect(pushMock).toHaveBeenCalledWith("/super-admin/profile");
  });

  it("signs out via next-auth when Sign out is clicked", async () => {
    const user = userEvent.setup();
    render(<Header user={{ name: "Jane Doe", role: "TEACHER" }} />);

    await user.click(screen.getByText("Jane Doe"));
    await user.click(await screen.findByText("Sign out"));

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("calls onMenuClick when the mobile hamburger button is pressed", async () => {
    const user = userEvent.setup();
    const onMenuClick = vi.fn();
    render(<Header user={{ name: "Jane Doe", role: "TEACHER" }} onMenuClick={onMenuClick} />);

    await user.click(screen.getByTitle("Open menu"));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
