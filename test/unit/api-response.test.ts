import { describe, it, expect } from "vitest";
import {
  ok,
  created,
  badRequest,
  duplicateValue,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-response";

async function read(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("api-response helpers", () => {
  it("ok() returns 200 success envelope", async () => {
    const { status, body } = await read(ok({ x: 1 }));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { x: 1 } });
  });

  it("created() returns 201", async () => {
    const { status, body } = await read(created({ id: "a" }));
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  it.each([
    [badRequest("bad"), 400, "bad"],
    [unauthorized(), 401, "Unauthorized"],
    [forbidden(), 403, "Forbidden"],
    [notFound(), 404, "Not found"],
  ])("error helper returns the right status + message", async (res, status, error) => {
    const parsed = await read(res);
    expect(parsed.status).toBe(status);
    expect(parsed.body).toEqual({ success: false, error });
  });

  it("serverError() hides internals behind a 500", async () => {
    const { status, body } = await read(serverError(new Error("db exploded")));
    expect(status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toMatch(/exploded/);
  });
});

describe("duplicateValue field mapping", () => {
  it("maps a known field to a friendly label (target shape)", async () => {
    const res = duplicateValue({ meta: { target: ["email"] } });
    const { status, body } = await read(res);
    expect(status).toBe(400);
    expect(body.error).toBe("Please enter correct value (Email)");
  });

  it("reads the driver-adapter constraint shape", async () => {
    const res = duplicateValue({
      meta: { driverAdapterError: { cause: { constraint: { fields: ["studentCode"] } } } },
    });
    const { body } = await read(res);
    expect(body.error).toBe("Please enter correct value (Student Code)");
  });

  it("humanizes an unknown camelCase field", async () => {
    const res = duplicateValue({ meta: { target: ["rollNumber"] } });
    const { body } = await read(res);
    expect(body.error).toBe("Please enter correct value (Roll Number)");
  });

  it("falls back to a humanized 'value' when no field info is present", async () => {
    const res = duplicateValue({});
    const { body } = await read(res);
    expect(body.error).toBe("Please enter correct value (Value)");
  });
});
