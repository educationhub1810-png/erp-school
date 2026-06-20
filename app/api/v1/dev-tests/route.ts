import { spawn } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { requireAuth } from "@/lib/auth-guard";
import { getUser } from "@/lib/session";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { saveTestRun, getRecentTestRuns } from "@/lib/test-db";

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
  ancestorTitles?: string[];
  duration?: number;
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

// GET — return the saved run history (last 5) for the analytics view.
export async function GET() {
  if (process.env.NODE_ENV === "production") return forbidden();

  const { error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();

  try {
    return ok({ history: await getRecentTestRuns() });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST() {
  if (process.env.NODE_ENV === "production") return forbidden();

  const { session, error } = await requireAuth(["SUPER_ADMIN"]);
  if (error === "unauthorized") return unauthorized();
  if (error === "forbidden") return forbidden();
  const actorId = getUser(session!).id;

  let dir: string | undefined;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "vitest-"));
    const outFile = path.join(dir, "result.json");
    const startedAt = Date.now();
    const { stderr } = await runVitest(outFile);
    const durationMs = Date.now() - startedAt;

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
      // Every individual test in the file (for the expandable detail view).
      tests: f.assertionResults.map((a) => ({
        title: a.title,
        suite: (a.ancestorTitles ?? []).join(" › "),
        status: a.status,
        duration: Math.round(a.duration ?? 0),
        message: a.status === "failed" ? a.failureMessages.join("\n").slice(0, 4000) : undefined,
      })),
    }));

    const summary = {
      total: json.numTotalTests,
      passed: json.numPassedTests,
      failed: json.numFailedTests,
      pending: json.numPendingTests ?? 0,
    };

    // Persist to the test DB (neontestdb) and prune to the last 5 runs. Storage
    // failures must not fail the run — the results are still returned.
    let saved = false;
    try {
      saved = await saveTestRun({
        ...summary,
        durationMs,
        triggeredBy: actorId,
        files: files.map((f) => ({ name: f.name, passed: f.passed, failed: f.failed })),
      });
    } catch (e) {
      console.error("[dev-tests] failed to save run history", e);
    }

    const history = saved ? await getRecentTestRuns().catch(() => []) : [];

    return ok({ summary, files, durationMs, ranAt: new Date().toISOString(), saved, history });
  } catch (e) {
    return serverError(e);
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
