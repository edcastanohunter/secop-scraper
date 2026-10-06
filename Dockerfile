# SECOP Radar — imagen de producción: compila con Node y sirve el bundle estático con nginx (sin root).
# Las URLs de la API y de Keycloak se incrustan al compilar (src/environments/environment.ts).
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG API_BASE_URL="https://api-secop.edcastdev.com"
ARG KEYCLOAK_URL="https://auth.edcastdev.com"
ARG KEYCLOAK_REALM="secopscrapper"
ARG KEYCLOAK_CLIENT_ID="secopscrapper-web"
# Reemplaza los valores de desarrollo; el grep final falla el build si algo quedó apuntando a localhost.
RUN test -n "$API_BASE_URL" && test -n "$KEYCLOAK_URL" \
 && sed -i \
      -e "s#apiBaseUrl: '[^']*'#apiBaseUrl: '${API_BASE_URL}'#" \
      -e "s#url: 'http://localhost:8080'#url: '${KEYCLOAK_URL}'#" \
      -e "s#realm: '[^']*'#realm: '${KEYCLOAK_REALM}'#" \
      -e "s#clientId: '[^']*'#clientId: '${KEYCLOAK_CLIENT_ID}'#" \
      src/environments/environment.ts \
 && ! grep -q localhost src/environments/environment.ts \
 && cat src/environments/environment.ts

RUN npm run build

FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine AS final
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/secop-radar/browser /usr/share/nginx/html
EXPOSE 8090
