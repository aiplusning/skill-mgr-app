#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4317}"
DB_PATH="${DB_PATH:-./data/skills.db}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/skill-mgr-smoke.XXXXXX")"
SCRATCH_SLUG="smoke-$(date +%s)-$$"
SCRATCH_DIR="seed/skills/${SCRATCH_SLUG}"
AGENT_ID=""
SKILL_ID=""
TOOL_PATH=""
TOOL_PATH_ESCAPED=""
TOOL_PATH_CHANGED=0

cleanup() {
  if [[ -n "$AGENT_ID" ]]; then
    curl -sS -X DELETE "$BASE_URL/api/agents/$AGENT_ID" >/dev/null 2>&1 || true
  fi
  if [[ "$TOOL_PATH_CHANGED" == 1 ]]; then
    sqlite3 "$DB_PATH" "UPDATE tools SET global_path='$TOOL_PATH_ESCAPED' WHERE id='agents';" >/dev/null 2>&1 || true
  fi
  if [[ -n "$SKILL_ID" ]]; then
    sqlite3 "$DB_PATH" "DELETE FROM skills WHERE id='$SKILL_ID';" >/dev/null 2>&1 || true
  fi
  rm -rf "$SCRATCH_DIR" "$TMP_DIR"
}
trap cleanup EXIT

pass() { printf 'PASS %s\n' "$1"; }

# Create a disposable valid Skill so smoke testing never overwrites user data.
mkdir -p "$SCRATCH_DIR"
cat > "$SCRATCH_DIR/SKILL.md" <<EOF
---
name: ${SCRATCH_SLUG}
description: Temporary Skill created by smoke test
---

Smoke test content.
EOF

response="$(curl -sS -X POST "$BASE_URL/api/scan" -H 'content-type: application/json' -d '{}')"
echo "$response" | jq -e '.ok == true' >/dev/null
pass 'scan endpoint'

skills="$(curl -sS "$BASE_URL/api/skills")"
echo "$skills" | jq -e '.ok == true and (.data | length > 0)' >/dev/null
SKILL_ID="$(echo "$skills" | jq -r --arg slug "$SCRATCH_SLUG" '.data[] | select(.slug == $slug) | .id' | head -n 1)"
[[ -n "$SKILL_ID" && "$SKILL_ID" != null ]]
pass 'skills list'

file="$(curl -sS "$BASE_URL/api/skills/$SKILL_ID/file")"
echo "$file" | jq -e '.ok == true and (.data.content | type == "string")' >/dev/null
content="$(echo "$file" | jq -r '.data.content')"
versions_before="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_versions WHERE skill_id='$SKILL_ID';")"
draft="$(jq -n --arg content "$content" --arg note 'smoke test draft' '{content:$content,note:$note}')"
draft_result="$(curl -sS -X POST "$BASE_URL/api/skills/$SKILL_ID/versions" -H 'content-type: application/json' -d "$draft")"
echo "$draft_result" | jq -e '.ok == true and (.data.version_id | type == "string")' >/dev/null
VERSION_ID="$(echo "$draft_result" | jq -r '.data.version_id')"
versions_after="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_versions WHERE skill_id='$SKILL_ID';")"
test "$versions_after" -eq "$((versions_before + 1))"
pass 'save draft variant'

restore="$(curl -sS -X POST "$BASE_URL/api/skills/$SKILL_ID/versions/$VERSION_ID/restore" -H 'content-type: application/json' -d '{"mode":"file"}')"
echo "$restore" | jq -e '.ok == true and (.data.backup_version_id | type == "string")' >/dev/null
versions_restored="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_versions WHERE skill_id='$SKILL_ID';")"
test "$versions_restored" -eq "$((versions_after + 1))"
pass 'restore variant with backup'

agent="$(curl -sS -X POST "$BASE_URL/api/agents" -H 'content-type: application/json' -d '{"name":"smoke-agent","description":"Temporary smoke-test agent"}')"
echo "$agent" | jq -e '.ok == true and (.data.id | type == "string")' >/dev/null
AGENT_ID="$(echo "$agent" | jq -r '.data.id')"
pass 'create agent'

# Reuse a second existing valid Skill for the composition assertion.
SECOND_SKILL_ID="$(sqlite3 "$DB_PATH" "SELECT id FROM skills WHERE status='ok' AND id != '$SKILL_ID' ORDER BY slug LIMIT 1;")"
if [[ -z "$SECOND_SKILL_ID" ]]; then
  echo 'Expected a second valid Skill for agent composition.' >&2
  exit 1
fi
composition="$(jq -n --arg first "$SKILL_ID" --arg second "$SECOND_SKILL_ID" '[{skill_id:$first,order_index:0},{skill_id:$second,order_index:1}]')"
composed="$(curl -sS -X PUT "$BASE_URL/api/agents/$AGENT_ID/skills" -H 'content-type: application/json' -d "$composition")"
echo "$composed" | jq -e '.ok == true and (.data | length == 2)' >/dev/null
pass 'compose two skills'

case_result="$(curl -sS -X POST "$BASE_URL/api/agents/$AGENT_ID/cases" -H 'content-type: application/json' -d '{"name":"smoke-preview","user_input":"Summarize the attached skills."}')"
echo "$case_result" | jq -e '.ok == true' >/dev/null
CASE_ID="$(echo "$case_result" | jq -r '.data.id')"
preview="$(curl -sS -X POST "$BASE_URL/api/cases/$CASE_ID/preview" -H 'content-type: application/json' -d '{"with_agent":true}')"
echo "$preview" | jq -e '.ok == true and (.data.system_prompt | length > 0)' >/dev/null
pass 'preview composed prompt'

# Isolate installation under a temporary directory, preserving the user's configured tool path.
TOOL_PATH="$(sqlite3 "$DB_PATH" "SELECT global_path FROM tools WHERE id='agents';")"
[[ -n "$TOOL_PATH" ]]
TOOL_PATH_ESCAPED="${TOOL_PATH//\'/\'\'}"
TEMP_INSTALL_ROOT="$TMP_DIR/agents-skills"
mkdir -p "$TEMP_INSTALL_ROOT"
TEMP_INSTALL_ESCAPED="${TEMP_INSTALL_ROOT//\'/\'\'}"
sqlite3 "$DB_PATH" "UPDATE tools SET global_path='$TEMP_INSTALL_ESCAPED' WHERE id='agents';"
TOOL_PATH_CHANGED=1
relations_before="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_tools WHERE skill_id='$SKILL_ID' AND tool_id='agents';")"
installed="$(curl -sS -X POST "$BASE_URL/api/skills/$SKILL_ID/install" -H 'content-type: application/json' -d '{"tool_id":"agents","mode":"copy"}')"
echo "$installed" | jq -e '.ok == true' >/dev/null
relations_installed="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_tools WHERE skill_id='$SKILL_ID' AND tool_id='agents';")"
test "$relations_installed" -eq "$((relations_before + 1))"
uninstalled="$(curl -sS -X DELETE "$BASE_URL/api/skills/$SKILL_ID/install/agents")"
echo "$uninstalled" | jq -e '.ok == true' >/dev/null
relations_uninstalled="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skill_tools WHERE skill_id='$SKILL_ID' AND tool_id='agents';")"
test "$relations_uninstalled" -eq "$relations_before"
pass 'install and uninstall copy'

echo '8 PASS'
