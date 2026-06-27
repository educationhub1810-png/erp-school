import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileView } from "@/components/shared/profile-view";
import type { ProfileData } from "@/lib/profile";

const baseData: ProfileData = {
  id: "u1",
  name: "Jane Doe",
  email: "jane@sch001.com",
  mobile: "9999999999",
  role: "SCHOOL_ADMIN",
  isActive: true,
  createdAt: new Date("2024-01-15"),
  schoolName: "Delhi Public School",
  schoolCode: "SCH001",
  photoUrl: null,
  details: [],
};

describe("ProfileView", () => {
  it("renders name, role badge, active status, and contact details", () => {
    render(<ProfileView data={baseData} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("School Admin")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("jane@sch001.com")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
    expect(screen.getByText("Delhi Public School (SCH001)")).toBeInTheDocument();
  });

  it("shows Inactive badge when the account is disabled", () => {
    render(<ProfileView data={{ ...baseData, isActive: false }} />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders role-specific Profile Details when present, and hides the card when empty", () => {
    const { rerender } = render(<ProfileView data={baseData} />);
    expect(screen.queryByText("Profile Details")).not.toBeInTheDocument();

    rerender(
      <ProfileView
        data={{
          ...baseData,
          role: "TEACHER",
          details: [
            { label: "Employee ID", value: "EMP100" },
            { label: "Qualification", value: "M.Ed" },
          ],
        }}
      />,
    );
    expect(screen.getByText("Profile Details")).toBeInTheDocument();
    expect(screen.getByText("EMP100")).toBeInTheDocument();
    expect(screen.getByText("M.Ed")).toBeInTheDocument();
  });

  it("falls back to initials when there is no photo", () => {
    render(<ProfileView data={baseData} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
