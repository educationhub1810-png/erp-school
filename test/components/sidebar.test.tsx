import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ usePathname: () => "/school-admin/dashboard" }));

import { Sidebar } from "@/components/shared/sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the nav items for the given role (collapsed by default, labels as tooltips)", async () => {
    render(<Sidebar role="SCHOOL_ADMIN" />);
    expect(await screen.findByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByTitle("Students")).toBeInTheDocument();
  });

  it("shows full nav labels inside the mobile drawer regardless of the collapsed preference", async () => {
    render(<Sidebar role="SCHOOL_ADMIN" mobileOpen />);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
  });

  it("does not render the mobile backdrop when the drawer is closed", async () => {
    render(<Sidebar role="SCHOOL_ADMIN" mobileOpen={false} />);
    await screen.findByTitle("Dashboard");
    expect(document.querySelector(".bg-black\\/50")).not.toBeInTheDocument();
  });

  it("renders a backdrop that closes the drawer on click when open", async () => {
    const user = userEvent.setup();
    const onMobileClose = vi.fn();
    render(<Sidebar role="SCHOOL_ADMIN" mobileOpen onMobileClose={onMobileClose} />);
    await screen.findByText("Dashboard");

    const backdrop = document.querySelector(".bg-black\\/50") as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);
    expect(onMobileClose).toHaveBeenCalled();
  });

  it("closes the mobile drawer via the close button", async () => {
    const user = userEvent.setup();
    const onMobileClose = vi.fn();
    render(<Sidebar role="SCHOOL_ADMIN" mobileOpen onMobileClose={onMobileClose} />);
    await screen.findByText("Dashboard");

    await user.click(screen.getByTitle("Close menu"));
    expect(onMobileClose).toHaveBeenCalled();
  });
});
