import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { MailboxInbox } from "@/components/mailbox/mailbox-inbox";
import type { MailboxMessageView } from "@/components/mailbox/types";

function makeMessage(over: Partial<MailboxMessageView> = {}): MailboxMessageView {
  return {
    id: "msg-1",
    source: "DEMO_REQUEST",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "9876543210",
    schoolName: "Greenwood High",
    message: "Interested in a demo.",
    status: "UNREAD",
    createdAt: "2026-01-01T00:00:00Z",
    replyCount: 0,
    ...over,
  };
}

describe("MailboxInbox", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as never;
  });

  it("renders the message list", () => {
    render(<MailboxInbox initialMessages={[makeMessage()]} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Demo Request")).toBeInTheDocument();
  });

  it("shows an empty state when there are no messages in the current filter", () => {
    render(<MailboxInbox initialMessages={[]} />);
    expect(screen.getByText(/no messages/i)).toBeInTheDocument();
  });

  it("opening an unread message fetches the detail and marks it read", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, init?: RequestInit) => {
      const detail = { ...makeMessage(), status: init?.method === "PATCH" ? "READ" : "UNREAD", replies: [] };
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: detail }) });
    });

    const user = userEvent.setup();
    render(<MailboxInbox initialMessages={[makeMessage()]} />);
    await user.click(screen.getByText("Jane Doe"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/interested in a demo\./i)).toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/mailbox/msg-1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "READ" }) }),
    ));
  });
});
