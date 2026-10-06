#!/usr/bin/env bash
# Despliega SECOP Radar en el VPS. La imagen ya la cargó CI (`podman load`).
#
#   bash deploy/deploy.sh [--force-restart]
#
# Orden: validar .env -> red de NPM -> levantar el contenedor -> esperar /health -> limpiar imágenes.
set -euo pipefail

FORCE_RESTART=false
for arg in "$@"; do
  case "$arg" in
    --force-restart) FORCE_RESTART=true ;;
    *) echo "Argumento desconocido: $arg" >&2; echo "Uso: $0 [--force-restart]" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
COMPOSE_FILE="compose.prod.yml"
WEB_SERVICE="secop-radar.web"
WEB_CONTAINER="secop-radar.web"
HEALTH_TIMEOUT_SECONDS=60

log() { echo "[deploy] $*"; }
fail() { echo "[deploy] ERROR: $*" >&2; exit 1; }

# Lee KEY de .env sin hacer source.
env_value() {
  local value
  value="$(grep -E "^[[:space:]]*$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

compose() { podman compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

# 1. Validar .env (sin imprimir valores).
[[ -f "$ENV_FILE" ]] || fail "no existe $SCRIPT_DIR/$ENV_FILE. Copiar .env.example a .env y completarlo."
PROXY_NETWORK="$(env_value PROXY_NETWORK)"
[[ -n "$PROXY_NETWORK" ]] || fail "falta PROXY_NETWORK en $ENV_FILE"

# 2. La red de NPM debe existir en este engine de Podman.
podman network exists "$PROXY_NETWORK" \
  || fail "la red '$PROXY_NETWORK' no existe en Podman (podman network ls). ¿NPM corre en otro engine?"

log "Tag de imagen: $(env_value WEB_TAG || true)"

# 3. Contenedor web.
if [[ "$FORCE_RESTART" == true ]]; then
  log "Levantando la web (--force-recreate)..."
  compose up -d --force-recreate "$WEB_SERVICE"
else
  log "Levantando la web..."
  compose up -d "$WEB_SERVICE"
fi

# 4. Esperar /health desde dentro del contenedor.
log "Esperando hasta ${HEALTH_TIMEOUT_SECONDS}s por /health..."
deadline=$(( SECONDS + HEALTH_TIMEOUT_SECONDS ))
until podman exec "$WEB_CONTAINER" wget -q -O /dev/null http://127.0.0.1:8090/health >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "[deploy] Últimos logs de la web:" >&2
    podman logs --tail 100 "$WEB_CONTAINER" >&2 || true
    fail "/health no respondió 200 en ${HEALTH_TIMEOUT_SECONDS}s."
  fi
  sleep 2
done
log "/health respondió 200."

# 5. Liberar disco: imágenes huérfanas de cargas anteriores.
podman image prune -f >/dev/null
log "Despliegue terminado."
