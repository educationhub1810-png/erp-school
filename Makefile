PORT := 3000
LOG  := .dev.log

.PHONY: run stop logs

run: stop
	@printf "Starting Next.js dev on port $(PORT)...\n"
	@export NVM_DIR="$$HOME/.nvm" && \. "$$NVM_DIR/nvm.sh" && \
	  npm run dev -- --port $(PORT) >> $(LOG) 2>&1 &
	@sleep 2
	@printf "Dev server running — logs: $(LOG)\n"
	@gnome-terminal -- bash -c "ngrok http --url=silk-grazing-twister.ngrok-free.dev $(PORT); exec bash" &

stop:
	@-pkill -f "next dev"    2>/dev/null; true
	@-pkill -f "next-server" 2>/dev/null; true
	@-pkill -f ngrok         2>/dev/null; true
	@-fuser -k $(PORT)/tcp   2>/dev/null; true
	@printf "Old processes stopped.\n"

logs:
	@tail -f $(LOG)
