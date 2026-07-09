import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildRequest, callRoute } from "../helpers/request";

// Don't hit real SMTP — assert the route asks to send the lead email.
const sendDemoRequestEmailMock = vi.fn();
vi.mock("@/lib/mailer", () => ({ sendDemoRequestEmail: (...a: unknown[]) => sendDemoRequestEmailMock(...a) }));

import { POST } from "@/app/api/public/demo-request/route";

const path = "/api/public/demo-request";

function req(body: unknown) {
  return buildRequest(path, { method: "POST", body });
}

const validBody = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "9876543210",
  schoolName: "Greenwood High",
  message: "Interested in a demo for our staff.",
};

beforeEach(() => {
  sendDemoRequestEmailMock.mockReset();
  sendDemoRequestEmailMock.mockResolvedValue(undefined);
});

describe("POST /api/public/demo-request", () => {
  it("400s on an invalid body", async () => {
    const res = await callRoute(POST, req({ name: "Jane" })); // missing required fields
    expect(res.status).toBe(400);
    expect(sendDemoRequestEmailMock).not.toHaveBeenCalled();
  });

  it("400s on an invalid email", async () => {
    const res = await callRoute(POST, req({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(sendDemoRequestEmailMock).not.toHaveBeenCalled();
  });

  it("emails the lead and returns success for a valid submission", async () => {
    const res = await callRoute(POST, req(validBody));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ submitted: true });

    expect(sendDemoRequestEmailMock).toHaveBeenCalledOnce();
    expect(sendDemoRequestEmailMock.mock.calls[0][0]).toMatchObject(validBody);
  });

  it("allows the optional message to be omitted", async () => {
    const { message, ...withoutMessage } = validBody;
    void message;
    const res = await callRoute(POST, req(withoutMessage));
    expect(res.status).toBe(200);
    expect(sendDemoRequestEmailMock).toHaveBeenCalledOnce();
  });

  it("500s and does not leak details when the email fails to send", async () => {
    sendDemoRequestEmailMock.mockRejectedValue(new Error("SMTP down"));
    const res = await callRoute(POST, req(validBody));
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
