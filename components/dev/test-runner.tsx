"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, XCircle, FlaskConical, History, Timer, Percent, Hash,
  ChevronRight, ChevronDown, MinusCircle,
} from "lucide-react";
import { TestHistoryChart, type HistoryPoint } from "./test-history-chart";

interface TestCase {
  title: string;
  suite: string;
  status: string;
  duration: number;
  message?: string;
}
interface FileResult {
  name: string;
  status: string;
  passed: number;
  failed: number;
  tests: TestCase[];
}
interface Summary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
}
interface HistoryRun {
  id: string;
  createdAt: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  durationMs: number;
}
interface RunResults {
  summary: Summary;
  files: FileResult[];
  durationMs: number;
  ranAt: string;
  saved: boolean;
  history: HistoryRun[];
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const passRate = (r: { passed: number; total: number }) => (r.total ? Math.round((r.passed / r.total) * 100) : 0);

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function TestRunner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RunResults | null>(null);
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleFile = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const setAllExpanded = (open: boolean) =>
    setExpanded(open ? new Set(results?.files.map((f) => f.name) ?? []) : new Set());

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/dev-tests");
      const json = await res.json();
      if (json.success) setHistory(json.data.history as HistoryRun[]);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/dev-tests", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setError(typeof json.error === "string" ? json.error : "Test run failed");
        return;
      }
      const data = json.data as RunResults;
      setResults(data);
      setHistory(data.history ?? []);
      // Auto-expand any file that has failures so problems are visible at a glance.
      setExpanded(new Set(data.files.filter((f) => f.failed > 0).map((f) => f.name)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const s = results?.summary;
  const allGreen = s && s.failed === 0;

  // Latest known run = the just-run result, else the newest in history.
  const latest = results
    ? { ...results.summary, durationMs: results.durationMs, createdAt: results.ranAt }
    : history[0];

  const avgDuration = history.length
    ? Math.round(history.reduce((a, r) => a + r.durationMs, 0) / history.length)
    : 0;

  // Chart wants oldest → newest.
  const chartData: HistoryPoint[] = [...history]
    .reverse()
    .map((r) => ({ label: fmtTime(r.createdAt).split(",").pop()!.trim(), passed: r.passed, failed: r.failed }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FlaskConical className="h-6 w-6" /> Test Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Runs the unit, API and component tests (Vitest). History is stored in the test database. Browser E2E runs
            separately via <code className="rounded bg-muted px-1">make e2e</code>.
          </p>
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Running…" : "Run tests"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="whitespace-pre-wrap p-4 font-mono text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Analytics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          icon={latest && latest.failed === 0 ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
          label="Latest run"
          value={latest ? `${latest.passed}/${latest.total}` : "—"}
          sub={latest ? `${passRate(latest)}% passing` : "no runs yet"}
        />
        <Kpi icon={<Percent className="h-5 w-5" />} label="Pass rate" value={latest ? `${passRate(latest)}%` : "—"} />
        <Kpi icon={<Timer className="h-5 w-5" />} label="Avg duration" value={avgDuration ? `${(avgDuration / 1000).toFixed(1)}s` : "—"} sub={`over ${history.length} run${history.length === 1 ? "" : "s"}`} />
        <Kpi icon={<Hash className="h-5 w-5" />} label="Runs kept" value={`${history.length}`} sub="last 5" />
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" /> History (last 5 runs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestHistoryChart data={chartData} />
          {history.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">Result</th>
                    <th className="py-2 pr-4 font-medium">Pass rate</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{fmtTime(r.createdAt)}</td>
                      <td className="py-2 pr-4">
                        <span className="text-green-600">{r.passed} passed</span>
                        {r.failed > 0 && <span className="text-red-600"> · {r.failed} failed</span>}
                        {r.pending > 0 && <span className="text-muted-foreground"> · {r.pending} skipped</span>}
                      </td>
                      <td className="py-2 pr-4">{passRate(r)}%</td>
                      <td className="py-2 pr-4">{(r.durationMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest run breakdown */}
      {s && (
        <Card className={allGreen ? "border-green-300" : "border-red-300"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {allGreen ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              {s.passed}/{s.total} passing
              {s.failed > 0 && <span className="text-red-600">· {s.failed} failed</span>}
              {s.pending > 0 && <span className="text-muted-foreground">· {s.pending} skipped</span>}
              <span className="ml-auto text-sm font-normal text-muted-foreground">{(results.durationMs / 1000).toFixed(1)}s</span>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Per-file breakdown — click a file to expand its individual tests */}
      {results && results.files.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Test files ({results.files.length})
          </h2>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setAllExpanded(true)} className="text-indigo-600 hover:underline">Expand all</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={() => setAllExpanded(false)} className="text-indigo-600 hover:underline">Collapse all</button>
          </div>
        </div>
      )}

      {results?.files.map((f) => {
        const open = expanded.has(f.name);
        return (
          <Card key={f.name}>
            <button
              type="button"
              onClick={() => toggleFile(f.name)}
              className="w-full text-left"
              aria-expanded={open}
            >
              <CardHeader className="py-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    {f.failed > 0 ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    <span className="font-mono">{f.name}</span>
                  </span>
                  <span className="flex gap-2">
                    <Badge variant="secondary">{f.passed} passed</Badge>
                    {f.failed > 0 && <Badge variant="destructive">{f.failed} failed</Badge>}
                  </span>
                </CardTitle>
              </CardHeader>
            </button>
            {open && (
              <CardContent className="space-y-1 border-t pt-3">
                {f.tests.map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-start gap-2 text-sm">
                      {t.status === "passed" ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                      ) : t.status === "failed" ? (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                      ) : (
                        <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      )}
                      <span className="flex-1">
                        {t.suite && <span className="text-muted-foreground">{t.suite} › </span>}
                        <span className={t.status === "failed" ? "text-red-700" : ""}>{t.title}</span>
                      </span>
                      {t.duration > 0 && <span className="shrink-0 text-xs text-muted-foreground">{t.duration}ms</span>}
                    </div>
                    {t.message && (
                      <pre className="ml-5 overflow-x-auto whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                        {t.message}
                      </pre>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
