/**
 * Utilidades para la clave canónica de contratistas (`supplierKey`) de SPEC 16.
 *
 * En SECOP I y II, la identificación es heterogénea: empresas con NIT en formatos
 * variables y personas naturales (muchos contratos de prestación de servicios) solo con nombre.
 *
 * Reglas de cálculo (idénticas a la función PostgreSQL `procurement.supplier_key`):
 * - Con NIT: `nit:<dígitos>` (antes del guion, sin puntos ni caracteres no numéricos).
 * - Sin NIT (Persona natural): `nombre:<NOMBRE NORMALIZADO>` (mayúsculas, sin tildes,
 *   espacios duplicados colapsados).
 * - Sin NIT ni nombre: `null`.
 */

export function computeSupplierKey(
  nit: string | null | undefined,
  name: string | null | undefined,
): string | null {
  if (nit) {
    const beforeDash = nit.split('-')[0] ?? '';
    const digits = beforeDash.replace(/\D/g, '');
    if (digits.length > 0) {
      return `nit:${digits}`;
    }
  }
  if (name) {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      const normalized = trimmed
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
      return `nombre:${normalized}`;
    }
  }
  return null;
}

/** Comprueba si la clave corresponde a una persona natural agrupada por nombre. */
export function isNaturalPerson(key: string | null | undefined): boolean {
  return typeof key === 'string' && key.startsWith('nombre:');
}

/** Comprueba si la clave corresponde a una persona jurídica o entidad con NIT. */
export function isLegalEntity(key: string | null | undefined): boolean {
  return typeof key === 'string' && key.startsWith('nit:');
}

/** Extrae los dígitos del NIT si la clave es de tipo `nit:`. */
export function supplierNitFromKey(key: string | null | undefined): string | null {
  if (typeof key === 'string' && key.startsWith('nit:')) {
    return key.slice(4);
  }
  return null;
}

/** Extrae el nombre canónico si la clave es de tipo `nombre:`. */
export function supplierNameFromKey(key: string | null | undefined): string | null {
  if (typeof key === 'string' && key.startsWith('nombre:')) {
    return key.slice(7);
  }
  return null;
}

/** Codifica el `supplierKey` para usar en rutas y parámetros URL. */
export function encodeSupplierKey(key: string): string {
  return encodeURIComponent(key);
}

/** Decodifica el `supplierKey` obtenido de rutas o parámetros URL. */
export function decodeSupplierKey(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** Etiqueta de tipo de persona según la clave. */
export function supplierTypeLabel(key: string | null | undefined): string {
  return isNaturalPerson(key) ? 'Persona natural' : 'Persona jurídica';
}
