#!/bin/bash
CLAUDE=$(ls -d ~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -1)

if [ -z "$CLAUDE" ] || [ ! -x "$CLAUDE" ]; then
  echo "Claude CLI not found"
  exit 1
fi

DIFF=$(git -C "$(dirname "$0")/.." diff --cached)

if [ -z "$DIFF" ]; then
  echo "No staged changes. Stage files first."
  exit 0
fi

echo "Generating commit message..."

MSG=$(echo "$DIFF" | "$CLAUDE" -p \
  "Write a git commit message for these changes. \
Use conventional commits: type(scope): description. \
Types: feat, fix, refactor, style, chore, docs. \
One line, max 72 chars, no punctuation at end. \
Output ONLY the commit message, no backticks, no explanation." 2>/dev/null \
  | sed 's/^```[a-z]*//;s/```$//;s/^[[:space:]]*//;s/[[:space:]]*$//' \
  | grep -v '^$' | head -1)

if [ -z "$MSG" ]; then
  echo "Failed to generate message."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  $MSG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy to clipboard via OSC 52 (works in VS Code integrated terminal)
printf "\e]52;c;%s\a" "$(printf '%s' "$MSG" | base64 -w 0)"

echo "Copied to clipboard — paste into the Source Control message box"
