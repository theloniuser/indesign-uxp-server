#!/bin/bash
# Stop hook: run the handler tests before Claude may finish, if code changed.
# exit 2 sends Claude back with stderr as feedback; exit 0 lets it finish.
# The test runner always exits 0, so pass/fail comes from its "Results:" line.
# The suite edits the ACTIVE document (adds pages, frames, layers, swatches), so it
# only runs when that document's name starts with "uxp-test-fixture".

input=$(cat)
cd "$(dirname "$0")/../.." || exit 0

# Only gate when source, bridge, or tests have uncommitted changes.
if [ -z "$(git status --porcelain -- src bridge tests 2>/dev/null)" ]; then
  exit 0
fi

already_blocked=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
BRIDGE=${UXP_BRIDGE_URL:-http://127.0.0.1:3000}
auth=()
[ -n "$BRIDGE_TOKEN" ] && auth=(-H "Authorization: Bearer $BRIDGE_TOKEN")

untested() {
  # Block once so Claude reports the change as untested; never loop.
  [ "$already_blocked" = "true" ] && exit 0
  echo "Code in src/bridge/tests changed but the handler tests did not run: $1" \
    "Tell the user the change is untested and what they need to do to run" \
    "npm test." >&2
  exit 2
}

connected=$(curl -sf -m 2 "$BRIDGE/status" | jq -r '.connected // false' 2>/dev/null)
[ "$connected" = "true" ] || untested "the bridge on :3000 is offline or the
InDesign panel is not connected (cd bridge && node server.js, open the Bridge panel)."

doc_name=$(curl -sf -m 5 "${auth[@]}" -H 'Content-Type: application/json' \
  -d '{"code":"return app.documents.length ? app.activeDocument.name : \"\";"}' \
  "$BRIDGE/execute" | jq -r '.result // ""' 2>/dev/null)
case "$doc_name" in
  uxp-test-fixture*) ;;
  *) untested "the active InDesign document is '${doc_name:-none}', not a
uxp-test-fixture document. The suite edits the active document, so it is never run on
real work. Open or create uxp-test-fixture.indd first." ;;
esac

out=$(mktemp -t indesign-uxp-tests) || exit 0
trap 'rm -f "$out"' EXIT
t=$(command -v timeout || command -v gtimeout)
${t:+$t 300} node tests/test-all-handlers.js > "$out" 2>&1
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
