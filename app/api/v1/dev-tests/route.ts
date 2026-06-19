import { spawn } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { requireAuth } from "@/lib/auth-guard";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";

// In-app test runner — runs the Vitest suite (unit + API + component) and
// returns a Jest-style JSON summary. SUPER_ADMIN only, and disabled in
// production (it shells out to the test runner, which isn't shipped to prod).
// E2E (Playwright) is NOT run here — use `npm run e2e` for browser tests.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface AssertionResult {
  title: string;
  status: string;
  failureMessages: string[];
}
interface FileResult {
  name: string;
  status: string;
  assertionResults: AssertionResult[];
}
interface VitestJson {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests?: number;
  testResults: FileResult[];
}

function runVitest(outFile: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["vitest", "run", "--reporter=json", `--outputFile=${outFile}`],
      { cwd: process.cwd(), env: { ...process.env, CI: "true" } },
    );
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
    child.on("error", () => resolve({ code: 1, stderr }));
  });
}

export async function POST() {
  if (process.env.NODE_ENV === "production") return forbidden();

  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  let dir: string | undefined;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "vitest-"));
    const outFile = path.join(dir, "result.json");
    const { stderr } = await runVitest(outFile);

    let raw: string;
    try {
      raw = await readFile(outFile, "utf8");
    } catch {
      return serverError(`Test runner produced no output. ${stderr.slice(-2000)}`);
    }
    const json = JSON.parse(raw) as VitestJson;

    const files = json.testResults.map((f) => ({
      name: path.relative(process.cwd(), f.name),
      status: f.status,
      passed: f.assertionResults.filter((a) => a.status === "passed").length,
      failed: f.assertionResults.filter((a) => a.status === "failed").length,
      failures: f.assertionResults
        .filter((a) => a.status === "failed")
        .map((a) => ({ title: a.title, message: a.failureMessages.join("\n").slice(0, 4000) })),
    }));

    return ok({
      summary: {
        total: json.numTotalTests,
        passed: json.numPassedTests,
        failed: json.numFailedTests,
        pending: json.numPendingTests ?? 0,
      },
      files,
      ranAt: new Date().toISOString(),
    });
  } catch (e) {
    return serverError(e);
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
