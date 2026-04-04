#!/usr/bin/env bash
set -euo pipefail

OWNER="${OWNER:-asetolessa711}"
REPO="${REPO:-Merkato}"
BRANCHES_CSV="${BRANCHES:-codespaces-mongo-setup-recovery,main}"
REQUIRED_CONTEXTS_CSV="${REQUIRED_CONTEXTS:-backend-required,frontend-targeted-required,runtime-bootstrap-required,e2e-smoke}"
FORBID_REQUIRED_CONTEXTS_CSV="${FORBID_REQUIRED_CONTEXTS:-automerge}"
APPLY="${APPLY:-false}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Missing GITHUB_TOKEN/GH_TOKEN" >&2
  exit 1
fi

IFS=',' read -r -a BRANCHES <<< "$BRANCHES_CSV"
IFS=',' read -r -a CONTEXTS <<< "$REQUIRED_CONTEXTS_CSV"
IFS=',' read -r -a FORBID_CONTEXTS <<< "$FORBID_REQUIRED_CONTEXTS_CSV"

declare -A FORBID_CONTEXT_MAP=()
for CONTEXT in "${FORBID_CONTEXTS[@]}"; do
  CONTEXT_TRIMMED="$(echo "$CONTEXT" | xargs)"
  [[ -z "$CONTEXT_TRIMMED" ]] && continue
  FORBID_CONTEXT_MAP["$CONTEXT_TRIMMED"]=1
done

declare -A SEEN_CONTEXTS=()
FILTERED_CONTEXTS=()
for CONTEXT in "${CONTEXTS[@]}"; do
  CONTEXT_TRIMMED="$(echo "$CONTEXT" | xargs)"
  [[ -z "$CONTEXT_TRIMMED" ]] && continue
  if [[ -n "${FORBID_CONTEXT_MAP["$CONTEXT_TRIMMED"]+x}" ]]; then
    echo "Skipping forbidden required context: $CONTEXT_TRIMMED" >&2
    continue
  fi
  if [[ -n "${SEEN_CONTEXTS["$CONTEXT_TRIMMED"]+x}" ]]; then
    continue
  fi
  SEEN_CONTEXTS["$CONTEXT_TRIMMED"]=1
  FILTERED_CONTEXTS+=("$CONTEXT_TRIMMED")
done

if [[ "${#FILTERED_CONTEXTS[@]}" -eq 0 ]]; then
  echo "No valid required contexts remain after filtering forbidden contexts." >&2
  exit 1
fi

CONTEXTS_JSON="$(printf '%s\n' "${FILTERED_CONTEXTS[@]}" | sed '/^$/d' | jq -R . | jq -s .)"
FILTERED_CONTEXTS_CSV="$(IFS=','; echo "${FILTERED_CONTEXTS[*]}")"

if [[ "$APPLY" != "true" ]]; then
  echo "Dry run (set APPLY=true to apply)."
fi

for BR in "${BRANCHES[@]}"; do
  BR_TRIMMED="$(echo "$BR" | xargs)"
  [[ -z "$BR_TRIMMED" ]] && continue

  CURRENT="$(curl -sS \
    "https://api.github.com/repos/$OWNER/$REPO/branches/$BR_TRIMMED/protection" \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $TOKEN")"

  PAYLOAD="$(jq -nc \
    --argjson current "$CURRENT" \
    --argjson contexts "$CONTEXTS_JSON" \
    '{
      required_status_checks: {
        strict: true,
        contexts: $contexts
      },
      enforce_admins: ($current.enforce_admins.enabled // false),
      required_pull_request_reviews: ($current.required_pull_request_reviews // null),
      restrictions: ($current.restrictions // null),
      required_conversation_resolution: ($current.required_conversation_resolution.enabled // false),
      allow_force_pushes: ($current.allow_force_pushes.enabled // false),
      allow_deletions: ($current.allow_deletions.enabled // false),
      block_creations: ($current.block_creations.enabled // false),
      required_linear_history: ($current.required_linear_history.enabled // false),
      lock_branch: ($current.lock_branch.enabled // false),
      allow_fork_syncing: ($current.allow_fork_syncing.enabled // true)
    }')"

  echo "---"
  echo "Branch: $BR_TRIMMED"
  echo "Required contexts: ${FILTERED_CONTEXTS_CSV}"

  if [[ "$APPLY" == "true" ]]; then
    RESP="$(curl -sS -X PUT \
      "https://api.github.com/repos/$OWNER/$REPO/branches/$BR_TRIMMED/protection" \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$PAYLOAD")"
    echo "$RESP" | jq '{url,required_status_checks,enforce_admins,required_pull_request_reviews}'
  else
    echo "$PAYLOAD" | jq '.'
  fi
done
