import { beforeAll, describe, expect, it } from "vitest";

let route: typeof import("@/app/api/inscribe/send/route");

beforeAll(async () => {
  route = await import("@/app/api/inscribe/send/route");
});

describe("inscribe send relay", () => {
  it("rejects junk payloads without hitting the RPC", async () => {
    const res = await route.POST(
      new Request("http://localhost/api/inscribe/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.21" },
        body: JSON.stringify({ tx: "not-base64!!!" }),
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid transaction" });
  });
});
