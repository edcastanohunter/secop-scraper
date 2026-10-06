# Tema de login de Keycloak: `secop-radar`

Las páginas de inicio de sesión y registro de Keycloak con el diseño de SECOP Radar: los mismos
tokens de color de `src/styles.css`, el logo del radar, modo claro y oscuro
(`prefers-color-scheme`) y textos en español de Colombia.

Extiende `keycloak.v2` (PatternFly 5) **solo con CSS y mensajes**: no sobrescribe plantillas
FreeMarker, así las actualizaciones de Keycloak no lo rompen.

```
secop-radar/login/
  theme.properties                 parent=keycloak.v2, darkMode, locale es
  resources/css/secop-radar.css    tokens → variables de PatternFly, tarjeta, campos, botones
  resources/img/logo.svg           marca del radar (se pinta con el acento vía máscara CSS)
  messages/messages_es.properties  textos ("Inicia sesión en SECOP Radar", "Crear cuenta"…)
```

## Cómo se carga

El `docker-compose.yml` del backend (`../SecopScraper/SecopScrapper`) monta esta carpeta en el
contenedor:

```yaml
- ../../SecopScraperWeb/keycloak-theme/secop-radar:/opt/keycloak/themes/secop-radar:ro
```

y `docker/keycloak/secopscrapper-realm.json` lo activa con `"loginTheme": "secop-radar"` y
`"defaultLocale": "es"`.

`--import-realm` **no sobrescribe un realm que ya existe**. Si tu volumen de Keycloak ya tiene el
realm, elige una opción:

- Consola de administración (`http://localhost:8080/admin`) → realm `secopscrapper` →
  _Realm settings_ → _Themes_ → _Login theme_ = `secop-radar`; y en _Localization_, activa la
  internacionalización con `es` por defecto; o
- recrea el volumen: `docker compose down` y `docker volume rm <proyecto>_secopscrapper-identity`
  (borra los usuarios creados a mano).

Hay que recrear el contenedor (`docker compose up -d secopscrapper.identity`) para que monte el
volumen nuevo.

## Desarrollo

Con `start-dev`, Keycloak no cachea los temas: edita el CSS y recarga la página. En producción
(`start`), añade `--spi-theme--cache-themes=false` solo mientras iteras.

Si cambias los colores de `src/styles.css`, copia los mismos valores en el bloque `--sr-*` al
inicio de `secop-radar.css`.
