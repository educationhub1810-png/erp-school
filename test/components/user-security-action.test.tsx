import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// next/image — render a plain <img> so jsdom doesn't choke on the optimizer.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src: string; alt: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

import { UserSecurityAction } from "@/app/super-admin/users/user-security-action";

const RESULT = {
  qrDataUrl: "data:image/png;base64,AAAA",
  secret: "JBSWY3DPEHPK3PXP",
  recoveryCodes: ["aaaaa-bbbbb", "ccccc-ddddd"],
  regenerated: false,
};

describe("UserSecurityAction", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: RESULT }) }) as never;
  });

  it("shows an Enable 2FA trigger for an un-enrolled user", () => {
    render(<UserSecurityAction userId="u1" name="Asha" email="asha@dps.edu.in" totpEnabled={false} />);
    expect(screen.getByRole("button", { name: /enable 2fa/i })).toBeInTheDocument();
  });

  it("shows a Regenerate 2FA trigger when already enrolled", () => {
    render(<UserSecurityAction userId="u1" name="Asha" email="asha@dps.edu.in" totpEnabled />);
    expect(screen.getByRole("button", { name: /regenerate 2fa/i })).toBeInTheDocument();
  });

  it("posts to the totp endpoint and reveals the QR, secret and recovery codes", async () => {
    const user = userEvent.setup();
    render(<UserSecurityAction userId="u1" name="Asha" email="asha@dps.edu.in" totpEnabled={false} />);

    await user.click(screen.getByRole("button", { name: /enable 2fa/i }));
    await user.click(screen.getByRole("button", { name: /^enable$/i }));

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/users/u1/totp", { method: "POST" });

    expect(await screen.findByText(RESULT.secret)).toBeInTheDocument();
    expect(screen.getByText(RESULT.recoveryCodes[0])).toBeInTheDocument();
    expect(screen.getByText(RESULT.recoveryCodes[1])).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /qr code/i })).toHaveAttribute("src", RESULT.qrDataUrl);
    expect(refreshMock).toHaveBeenCalled();
  });
});
