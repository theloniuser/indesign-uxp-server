#!/bin/bash
# Stop hook: run the handler tests before Claude may finish, if code changed.
# exit 2 sends Claude back with stderr as feedback; exit 0 lets it finish.
# The test runner always exits 0, so pass/fail comes from its "Results:" line.

input=$(cat)
cd "$(dirname "$0")/../.." || exit 0

# Only gate when source, bridge, or tests have uncommitted changes.
if [ -z "$(git status --porcelain -- src bridge tests 2>/dev/null)" ]; then
  exit 0
fi

already_blocked=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
out=/tmp/indesign-uxp-test-output.txt

if ! curl -s -m 2 -o /dev/null http://127.0.0.1:3000/; then
  # Bridge offline: tests cannot run. Block once so Claude reports it honestly.
  [ "$already_blocked" = "true" ] && exit 0
  echo "Code in src/bridge/tests changed but the bridge on :3000 is offline, so" \
    "tests did not run. Tell the user the change is untested and how to start" \
    "the bridge (cd bridge && node server.js, InDesign panel connected)." >&2
  exit 2
fi

timeout 300 node tests/test-all-handlers.js > "$out" 2>&1
summary=$(grep -E '^Results: ' "$out" | tail -1)

if [ -n "$summary" ] && printf '%s' "$summary" | grep -qE ', 0 failed$'; then
  exit 0
fi

if [ -z "$summary" ] && [ "$already_blocked" = "true" ]; then
  exit 0  # runner crashed twice; don't loop, Claude was already told once
fi

echo "Handler tests are failing (${summary:-no Results line, runner crashed})." \
  "Fix them before you finish, or tell the user exactly what fails:" >&2
if [ -n "$summary" ]; then
  grep -E '✗' "$out" | head -20 >&2
else
  tail -n 15 "$out" >&2
fi
exit 2
