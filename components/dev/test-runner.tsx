"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, FlaskConical } from "lucide-react";

interface Failure {
  title: string;
  message: string;
}
interface FileResult {
  name: string;
  status: string;
  passed: number;
  failed: number;
  failures: Failure[];
}
interface Results {
  summary: { total: number; passed: number; failed: number; pending: number };
  files: FileResult[];
  ranAt: string;
}

export function TestRunner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);

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
      setResults(json.data as Results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const s = results?.summary;
  const allGreen = s && s.failed === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FlaskConical className="h-6 w-6" /> Test Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Runs the unit, API and component tests (Vitest). Browser E2E tests run separately via{" "}
            <code className="rounded bg-muted px-1">npm run e2e</code>.
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

      {s && (
        <Card className={allGreen ? "border-green-300" : "border-red-300"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {allGreen ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {s.passed}/{s.total} passing
              {s.failed > 0 && <span className="text-red-600">· {s.failed} failed</span>}
              {s.pending > 0 && <span className="text-muted-foreground">· {s.pending} skipped</span>}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {results?.files.map((f) => (
        <Card key={f.name}>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="font-mono">{f.name}</span>
              <span className="flex gap-2">
                <Badge variant="secondary">{f.passed} passed</Badge>
                {f.failed > 0 && <Badge variant="destructive">{f.failed} failed</Badge>}
              </span>
            </CardTitle>
          </CardHeader>
          {f.failures.length > 0 && (
            <CardContent className="space-y-3">
              {f.failures.map((fail, i) => (
                <div key={i} className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="font-medium text-red-700">{fail.title}</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-red-600">{fail.message}</pre>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
