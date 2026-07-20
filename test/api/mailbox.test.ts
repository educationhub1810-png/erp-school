import { describe, it, expect, beforeEach, vi } from "vitest";

const sendMailboxReplyEmailMock = vi.fn();
vi.mock("@/lib/mailer", () => ({ sendMailboxReplyEmail: (...a: unknown[]) => sendMailboxReplyEmailMock(...a) }));

import { GET } from "@/app/api/v1/mailbox/route";
import { GET as GET_ID, PATCH } from "@/app/api/v1/mailbox/[id]/route";
import { POST as REPLY } from "@/app/api/v1/mailbox/[id]/reply/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeMailboxMessage } from "../helpers/factories";

function messageRow(over: Record<string, unknown> = {}) {
  return { ...makeMailboxMessage(), _count: { replies: 0 }, ...over };
}

function detailRow(over: Record<string, unknown> = {}) {
  return { ...makeMailboxMessage(), replies: [], ...over };
}

beforeEach(() => {
  sendMailboxReplyEmailMock.mockReset();
  sendMailboxReplyEmailMock.mockResolvedValue(undefined);
});

describe("GET /api/v1/mailbox", () => {
  beforeEach(() => {
    prismaMock.mailboxMessage.findMany.mockResolvedValue([] as never);
  });

  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(GET, ["SUPER_ADMIN"], () => buildRequest("/api/v1/mailbox"));
  });

  it("returns the message list", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.mailboxMessage.findMany.mockResolvedValue([messageRow()] as never);
    const res = await callRoute(GET, buildRequest("/api/v1/mailbox"));
    expect(res.status).toBe(200);
    expect((res.body.data as { messages: unknown[] }).messages).toHaveLength(1);
  });
});

describe("GET /api/v1/mailbox/[id]", () => {
  it("enforces RBAC (Super Admin only)", async () => {
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(detailRow() as never);
    await expectRbac(GET_ID, ["SUPER_ADMIN"], () => buildRequest("/api/v1/mailbox/x"), paramsCtx({ id: "x" }));
  });

  it("404s for a missing message", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/mailbox/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(404);
  });

  it("returns the detail view", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(detailRow() as never);
    const res = await callRoute(GET_ID, buildRequest("/api/v1/mailbox/x"), paramsCtx({ id: "x" }));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/v1/mailbox/[id]", () => {
  beforeEach(() => {
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(detailRow() as never);
    prismaMock.mailboxMessage.update.mockResolvedValue(detailRow({ status: "ARCHIVED" }) as never);
  });

  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(
      PATCH,
      ["SUPER_ADMIN"],
      () => buildRequest("/api/v1/mailbox/x", { method: "PATCH", body: { status: "ARCHIVED" } }),
      paramsCtx({ id: "x" }),
    );
  });

  it("400s on an invalid status", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      PATCH,
      buildRequest("/api/v1/mailbox/x", { method: "PATCH", body: { status: "BOGUS" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(400);
  });

  it("404s for a missing message", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      PATCH,
      buildRequest("/api/v1/mailbox/x", { method: "PATCH", body: { status: "ARCHIVED" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(404);
  });

  it("updates the status", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      PATCH,
      buildRequest("/api/v1/mailbox/x", { method: "PATCH", body: { status: "ARCHIVED" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.mailboxMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "x" }, data: { status: "ARCHIVED" } }),
    );
  });
});

describe("POST /api/v1/mailbox/[id]/reply", () => {
  beforeEach(() => {
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(detailRow() as never);
    prismaMock.mailboxReply.create.mockResolvedValue({ id: "reply-1" } as never);
    prismaMock.mailboxMessage.update.mockResolvedValue(detailRow({ status: "REPLIED" }) as never);
  });

  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(
      REPLY,
      ["SUPER_ADMIN"],
      () => buildRequest("/api/v1/mailbox/x/reply", { method: "POST", body: { body: "Thanks for reaching out!" } }),
      paramsCtx({ id: "x" }),
    );
  });

  it("400s on an empty reply body", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      REPLY,
      buildRequest("/api/v1/mailbox/x/reply", { method: "POST", body: { body: "" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(400);
    expect(sendMailboxReplyEmailMock).not.toHaveBeenCalled();
  });

  it("404s for a missing message", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.mailboxMessage.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(
      REPLY,
      buildRequest("/api/v1/mailbox/x/reply", { method: "POST", body: { body: "Hi there" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(404);
  });

  it("sends the reply email, records it, and marks the message replied", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(
      REPLY,
      buildRequest("/api/v1/mailbox/x/reply", { method: "POST", body: { body: "Thanks for reaching out!" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(201);
    expect(sendMailboxReplyEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", name: "Jane Doe", body: "Thanks for reaching out!" }),
    );
    expect(prismaMock.mailboxReply.create).toHaveBeenCalledOnce();
    expect(prismaMock.mailboxMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "x" }, data: { status: "REPLIED" } }),
    );
  });

  it("500s and does not record a reply when the email fails to send", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    sendMailboxReplyEmailMock.mockRejectedValue(new Error("SMTP down"));
    const res = await callRoute(
      REPLY,
      buildRequest("/api/v1/mailbox/x/reply", { method: "POST", body: { body: "Thanks for reaching out!" } }),
      paramsCtx({ id: "x" }),
    );
    expect(res.status).toBe(500);
    expect(prismaMock.mailboxReply.create).not.toHaveBeenCalled();
  });
});
