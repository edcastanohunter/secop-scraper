// Genera `src/app/api/generated/schema.d.ts` desde el OpenAPI de SecopScrapper.
//
//   npm run gen:api                       # usa SecopScrapper_V1.json (raíz del repo)
//   npm run gen:api -- --from <ruta.json> # otra copia, p. ej. la del backend
//
// .NET publica los números como `type: [integer|number, string]` (por
// `AllowReadingFromString`), pero la API siempre escribe números JSON: aquí se generan como
// `number` (o `number | null` si el esquema admite null).
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import ts from 'typescript';

const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const source = resolve(fromIndex >= 0 ? args[fromIndex + 1] : 'SecopScrapper_V1.json');
const target = resolve('src/app/api/generated/schema.d.ts');

const NUMBER = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
const NULL = ts.factory.createLiteralTypeNode(ts.factory.createNull());

const ast = await openapiTS(pathToFileURL(source), {
  transform(schema) {
    const types = Array.isArray(schema.type) ? schema.type : [];
    const numeric = types.includes('integer') || types.includes('number');
    if (!numeric || !types.includes('string')) return undefined;
    return types.includes('null') ? ts.factory.createUnionTypeNode([NUMBER, NULL]) : NUMBER;
  },
});

const header =
  '/**\n * Generado por `npm run gen:api` desde el OpenAPI de SecopScrapper. No editar a mano.\n' +
  ' * Las correcciones al contrato viven en `../models.ts`.\n */\n\n';

await mkdir(dirname(target), { recursive: true });
await writeFile(target, header + astToString(ast));
console.log(`OpenAPI ${source} → ${target}`);
