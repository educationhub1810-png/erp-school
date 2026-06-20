PORT := 3000
LOG  := .dev.log
NODE := export NVM_DIR="$$HOME/.nvm" && \. "$$NVM_DIR/nvm.sh"

.PHONY: run stop logs test test-watch test-ui test-cov e2e test-db-setup

run: stop
	@printf "Starting Next.js dev on port $(PORT)...\n"
	@export NVM_DIR="$$HOME/.nvm" && \. "$$NVM_DIR/nvm.sh" && \
	  npm run dev -- --port $(PORT) >> $(LOG) 2>&1 &
	@sleep 2
	@printf "Dev server running on http://localhost:$(PORT) — logs: $(LOG)\n"

stop:
	@-pkill -f "next dev"    2>/dev/null; true
	@-pkill -f "next-server" 2>/dev/null; true
	@-fuser -k $(PORT)/tcp   2>/dev/null; true
	@printf "Old processes stopped.\n"

logs:
	@tail -f $(LOG)

# Run the local test suite (unit + API + component). Uses a mocked database —
# does NOT touch the real DB, so it never writes audit logs or other rows.
test:
	@$(NODE) && npm test

test-watch:
	@$(NODE) && npm run test:watch

test-ui:
	@$(NODE) && npm run test:ui

test-cov:
	@$(NODE) && npm run test:cov

# Browser end-to-end tests. Always run against the `neontestdb` test database
# (Playwright boots a dev server that sources .env.test) — never production.
# Depends on `stop` so port $(PORT) is free for Playwright's own server.
e2e: stop
	@$(NODE) && npm run e2e

# One-time (or after schema changes): create/migrate/seed the test database.
test-db-setup:
	@$(NODE) && set -a && . ./.env.test && set +a && \
	  npx prisma migrate deploy && npm run db:seed
