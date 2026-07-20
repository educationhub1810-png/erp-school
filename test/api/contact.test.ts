import { describe, it, expect, beforeEach } from "vitest";
import { buildRequest, callRoute } from "../helpers/request";
import { prismaMock } from "../mocks/prisma";
import { makeMailboxMessage } from "../helpers/factories";

import { POST } from "@/app/api/public/contact/route";

const path = "/api/public/contact";

function req(body: unknown) {
  return buildRequest(path, { method: "POST", body });
}

const validBody = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "9876543210",
  message: "Do you support multiple campuses?",
};

beforeEach(() => {
  prismaMock.mailboxMessage.create.mockResolvedValue(makeMailboxMessage({ source: "CONTACT" }) as never);
});

describe("POST /api/public/contact", () => {
  it("400s on missing required fields", async () => {
    const res = await callRoute(POST, req({ name: "Jane" }));
    expect(res.status).toBe(400);
    expect(prismaMock.mailboxMessage.create).not.toHaveBeenCalled();
  });

  it("400s on an invalid email", async () => {
    const res = await callRoute(POST, req({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(prismaMock.mailboxMessage.create).not.toHaveBeenCalled();
  });

  it("400s when the message is empty", async () => {
    const res = await callRoute(POST, req({ ...validBody, message: "" }));
    expect(res.status).toBe(400);
    expect(prismaMock.mailboxMessage.create).not.toHaveBeenCalled();
  });

  it("persists a mailbox message and returns success for a valid submission", async () => {
    const res = await callRoute(POST, req(validBody));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ submitted: true });

    expect(prismaMock.mailboxMessage.create).toHaveBeenCalledOnce();
    const data = prismaMock.mailboxMessage.create.mock.calls[0][0]!.data as Record<string, unknown>;
    expect(data).toMatchObject({ source: "CONTACT", schoolName: null, ...validBody });
  });

  it("allows the optional phone to be omitted", async () => {
    const { phone, ...withoutPhone } = validBody;
    void phone;
    const res = await callRoute(POST, req(withoutPhone));
    expect(res.status).toBe(201);
    expect(prismaMock.mailboxMessage.create).toHaveBeenCalledOnce();
  });

  it("500s and does not leak details when the write fails", async () => {
    prismaMock.mailboxMessage.create.mockRejectedValue(new Error("DB down"));
    const res = await callRoute(POST, req(validBody));
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
