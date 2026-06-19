import { TestRunner } from "@/components/dev/test-runner";

// In-app test dashboard (SUPER_ADMIN only — enforced by middleware on the
// /super-admin prefix). The runner endpoint is itself disabled in production.
export default function TestsPage() {
  return <TestRunner />;
}
