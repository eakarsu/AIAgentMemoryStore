#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then set -a; source "$PROJECT_DIR/.env"; set +a; fi
export BACKEND_PORT="${BACKEND_PORT:-4059}"
export FRONTEND_PORT="${FRONTEND_PORT:-4058}"
export RUNTIME_PROJECT_NAME="AI Agent Memory Store"
export RUNTIME_AI_ENDPOINT="/api/ai/memory-governance-review"
export RUNTIME_AI_FEATURE="agent-memory-governance-review"
export RUNTIME_AI_SYSTEM_PROMPT="Review agent-memory operations for tenant isolation, provenance, prompt-injection risk, retention, and safe retrieval behavior."
fail(){ echo "ERROR: $*" >&2; exit 1; }
port_free(){ ! lsof -ti ":$1" >/dev/null 2>&1; }
echo "Agent Memory Store"
echo "Read-only startup preflight; migrations, admin provisioning and demo data are separate commands."
command -v node >/dev/null 2>&1||fail "Node.js is required."
[ -d "$PROJECT_DIR/backend/node_modules" ]||fail "Backend dependencies are missing; install them explicitly."
[ -d "$PROJECT_DIR/frontend/node_modules" ]||fail "Frontend dependencies are missing; install them explicitly."
port_free "$BACKEND_PORT"||fail "Backend port $BACKEND_PORT is already in use."
port_free "$FRONTEND_PORT"||fail "Frontend port $FRONTEND_PORT is already in use."
if [ "${MIGRATE_ON_START:-false}" = true ]; then
  case "${ALLOW_SCHEMA_MIGRATION:-}" in 1|true) ;; *) fail "ALLOW_SCHEMA_MIGRATION=1 or true is required for startup migration.";; esac
  (cd "$PROJECT_DIR/backend"&&npm run migrate)
  (cd "$PROJECT_DIR/backend"&&npm run create-admin)
fi
cleanup(){ trap - INT TERM EXIT; [ -n "${BACKEND_PID:-}" ]&&kill "$BACKEND_PID" 2>/dev/null||true; [ -n "${FRONTEND_PID:-}" ]&&kill "$FRONTEND_PID" 2>/dev/null||true; }
trap cleanup INT TERM EXIT
(cd "$PROJECT_DIR/backend"&&node server.js)& BACKEND_PID=$!
(cd "$PROJECT_DIR/frontend"&&HOST=127.0.0.1 PORT="$FRONTEND_PORT" VITE_API_BASE="http://127.0.0.1:$BACKEND_PORT/api" npm start)& FRONTEND_PID=$!
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
wait "$BACKEND_PID" "$FRONTEND_PID"
