# SPEC 17: Actualizar contrato a demanda y marca de valor sospechoso (frontend)

Origen: `SecopScrapper/specs/17-refrescar-contrato-a-demanda.md` (backend). Estado: contrato final
para el spec; confirmar contra `docs/openapi/secopscrapper.json` cuando se fusione el PR del
backend. Mientras tanto los campos nuevos están tipados a mano en `src/app/api/models.ts`.

## 1. Alcance

Dos cambios independientes en las vistas de contratos:

1. Botón **"Actualizar desde SECOP"** en el detalle del contrato. Relee ese contrato desde Socrata
   y actualiza lo guardado. Solo visible con el permiso `procurement:refresh`.
2. Insignia de **valor sospechoso** (`valueFlag`) en el detalle y en las listas de contratos, para
   montos claramente erróneos (p. ej. `577.152.576.000.000` COP en un contrato de 180 días).

Ejemplo motivador: `/contratos/secop2/CO1.PCCNTR.9239943`. Socrata publica
`valor_del_contrato = 577152576000000` (tres ceros de más). Un refresh **no** lo corrige mientras la
fuente esté mal; la UI debe dejarlo claro.

## 2. API

### 2.1 Campos nuevos

`GET /api/v1/contracts` (items) y `GET /api/v1/contracts/{source}/{sourceId}`:

| Campo       | Tipo             | Notas                                                                |
| ----------- | ---------------- | -------------------------------------------------------------------- |
| `valueFlag` | `string \| null` | `null` o `"implausible"`. Un valor futuro desconocido es advertencia |

Solo el detalle:

| Campo             | Tipo                      | Notas                                              |
| ----------------- | ------------------------- | -------------------------------------------------- |
| `refreshable`     | `boolean`                 | `true` solo para `secop2`; `false` oculta el botón |
| `lastRefreshedAt` | `string (ISO 8601)\|null` | Última lectura desde Socrata (ingesta o refresh)   |
| `sourceUpdatedAt` | `string (ISO 8601)\|null` | Última actualización publicada por la fuente       |

`valueFlag = "implausible"` significa `value >= 10.000.000.000.000` COP (configurable en el
backend). No cambia `value`, el orden ni los totales de `stats/*`. La UI **no** recalcula el umbral.

### 2.2 Endpoint de refresh

`POST /api/v1/contracts/secop2/{sourceId}/refresh` (sin cuerpo; `sourceId` codificado en URL).

- Permiso `procurement:refresh`; los lectores reciben 403. La visibilidad del botón se decide con
  los roles, no con el 403.
- Límite: 10 por minuto por usuario, 60 s de espera por contrato.

Respuesta 200: `{ sourceId, changed, refreshedAt, sourceUpdatedAt, changes[], contract }`, donde
`contract` es el `ContractDetail` ya actualizado (incluye `valueFlag`) y `changes[].field` es uno de
`value`, `paidValue`, `status`, `sourceUpdatedAt`, `endsAt` (`before`/`after` numéricos para montos,
texto para el resto).

| Estado                            | Significado                    | UI                                                       |
| --------------------------------- | ------------------------------ | -------------------------------------------------------- |
| 403                               | Sin `procurement:refresh`      | Mensaje genérico de falta de permiso                     |
| 404 `Contracts.NotFound`          | No está en nuestra base        | "No encontramos este contrato."                          |
| 404 `Contracts.NotInSource`       | Socrata ya no lo devuelve      | "SECOP ya no lista este contrato. Conservamos la copia…" |
| 429 `Contracts.RefreshCooldown`   | Actualizado hace menos de 60 s | Deshabilitar el botón según `Retry-After`                |
| 429 (rate limit)                  | Demasiadas solicitudes         | Igual                                                    |
| 502 `Contracts.SourceUnavailable` | Socrata caído; nada cambió     | "El servicio de datos de SECOP no está disponible…"      |

## 3. Comportamiento de la UI

### 3.1 Botón (solo detalle)

- Visible solo con `refreshable === true` **y** rol `procurement:refresh`.
- Etiqueta "Actualizar desde SECOP"; al lado "Actualizado por última vez: {relativo}" con la fecha
  absoluta en el tooltip.
- En vuelo: deshabilitado con spinner.
- `changed: true`: reemplazar el estado con `response.contract` (sin GET extra) y listar los
  `changes` como antes → después, montos en COP.
- `changed: false`: "SECOP todavía publica los mismos datos para este contrato." más la fecha de
  actualización en la fuente; si sigue `implausible`: "Si el valor es incorrecto, la entidad
  contratante debe corregirlo en SECOP II."
- No se agrega a filas de listas. No hay auto-refresh al cargar.

### 3.2 Valor sospechoso

- Detalle: insignia ámbar (no roja) "Valor sospechoso" junto al valor, con tooltip: "Este valor es
  inusualmente alto y probablemente es un error en la fuente de datos (SECOP). No lo use en análisis
  sin verificarlo." El valor sigue visible, con estilo atenuado.
- Listas, tarjetas y tablas (incluida la ficha de contratista, SPEC 16): ícono con el mismo
  tooltip, solo ícono en móvil.
- Accesibilidad: `aria-label="Valor sospechoso"`; no depender solo del color.
- Sin filtro por `valueFlag` (el backend aún no lo tiene).
- Los totales de `stats/*`, los gráficos y el ranking de contratistas siguen incluyendo valores
  marcados. En la ficha de contratista se avisa "Incluye contratos con valores sospechosos" cuando
  algún contrato listado está marcado.

## 4. Lista de verificación

- [x] `valueFlag`, `refreshable`, `lastRefreshedAt`, `sourceUpdatedAt` en los modelos.
- [x] Componente reutilizable `ValueFlagBadge` (detalle, listas y ficha de contratista).
- [x] Rol `procurement:refresh` y botón tras `*appHasRole`.
- [x] Estados de carga, éxito (`changed` true/false) y error; `Retry-After` en 429.
- [x] Estado local reemplazado por `response.contract`.
- [x] Aviso en la ficha de contratista.
- [x] Botón oculto si `refreshable === false`.
- [ ] Verificar contra el backend real con `secop2/CO1.PCCNTR.9239943` (badge visible y
      `changed: false` mientras Socrata conserve el valor erróneo). En los mocks el contrato
      equivalente es `CO1.PCCNTR.8000300`.
