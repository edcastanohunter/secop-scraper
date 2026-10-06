/**
 * Nombre de archivo de una cabecera `Content-Disposition` (RFC 6266). Prefiere `filename*`
 * (RFC 5987, UTF-8 codificado) sobre `filename`. Devuelve `fallback` si no hay ninguno.
 */
export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;

  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (extended) {
    try {
      return sanitize(decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ''))) || fallback;
    } catch {
      // Codificación inválida: se intenta con `filename`.
    }
  }

  const plain = /filename\s*=\s*("((?:\\.|[^"\\])*)"|[^;]+)/i.exec(header);
  if (plain) {
    const value = plain[2] !== undefined ? plain[2].replace(/\\(.)/g, '$1') : plain[1].trim();
    return sanitize(value) || fallback;
  }
  return fallback;
}

/** Quita rutas: el servidor no decide la carpeta de destino. */
function sanitize(name: string): string {
  return name.split(/[\\/]/).pop()?.trim() ?? '';
}

/** Descarga un `Blob` en el navegador con el nombre dado. */
export function saveBlob(blob: Blob, filename: string, doc: Document = document): void {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  doc.body.appendChild(link);
  link.click();
  link.remove();
  // Se libera después del clic: algunos navegadores leen la URL de forma asíncrona.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
