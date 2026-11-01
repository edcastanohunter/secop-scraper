import {
  computeSupplierKey,
  decodeSupplierKey,
  encodeSupplierKey,
  isLegalEntity,
  isNaturalPerson,
  supplierNameFromKey,
  supplierNitFromKey,
  supplierTypeLabel,
} from './supplier';

describe('supplier utils', () => {
  describe('computeSupplierKey', () => {
    it('normaliza NIT con puntos y dígito de verificación', () => {
      expect(computeSupplierKey('900.123.456-1', 'ACME S.A.S.')).toBe('nit:900123456');
    });

    it('normaliza NIT con guion sin puntos', () => {
      expect(computeSupplierKey('900123456-1', 'ACME S.A.S.')).toBe('nit:900123456');
    });

    it('normaliza NIT sin guion', () => {
      expect(computeSupplierKey('900123456', 'ACME S.A.S.')).toBe('nit:900123456');
    });

    it('normaliza nombre sin NIT con tildes y espacios repetidos', () => {
      expect(computeSupplierKey(null, '  Kelly  Johana Castaño ')).toBe(
        'nombre:KELLY JOHANA CASTANO',
      );
      expect(computeSupplierKey(undefined, 'DIANA  MARCELA PEÑA')).toBe(
        'nombre:DIANA MARCELA PENA',
      );
      expect(computeSupplierKey('', 'Diana Marcela Peña')).toBe('nombre:DIANA MARCELA PENA');
    });

    it('retorna null cuando no hay NIT ni nombre o están vacíos', () => {
      expect(computeSupplierKey(null, null)).toBeNull();
      expect(computeSupplierKey(null, '')).toBeNull();
      expect(computeSupplierKey('', '   ')).toBeNull();
      expect(computeSupplierKey('   ', '')).toBeNull();
    });

    it('prioriza NIT sobre nombre cuando ambos existen', () => {
      expect(computeSupplierKey('900999888', 'Tech Corp')).toBe('nit:900999888');
    });
  });

  describe('isNaturalPerson / isLegalEntity', () => {
    it('reconoce claves de tipo persona natural y jurídica', () => {
      expect(isNaturalPerson('nombre:DIANA MARCELA PENA')).toBe(true);
      expect(isNaturalPerson('nit:900123456')).toBe(false);
      expect(isNaturalPerson(null)).toBe(false);

      expect(isLegalEntity('nit:900123456')).toBe(true);
      expect(isLegalEntity('nombre:DIANA MARCELA PENA')).toBe(false);
      expect(isLegalEntity(null)).toBe(false);
    });
  });

  describe('supplierNitFromKey / supplierNameFromKey', () => {
    it('extrae NIT o nombre correctamente', () => {
      expect(supplierNitFromKey('nit:900123456')).toBe('900123456');
      expect(supplierNitFromKey('nombre:DIANA MARCELA PENA')).toBeNull();

      expect(supplierNameFromKey('nombre:DIANA MARCELA PENA')).toBe('DIANA MARCELA PENA');
      expect(supplierNameFromKey('nit:900123456')).toBeNull();
    });
  });

  describe('encodeSupplierKey / decodeSupplierKey', () => {
    it('codifica y decodifica correctamente dos puntos y espacios', () => {
      const key = 'nombre:DIANA MARCELA PENA';
      const encoded = encodeSupplierKey(key);
      expect(encoded).toBe('nombre%3ADIANA%20MARCELA%20PENA');
      expect(decodeSupplierKey(encoded)).toBe(key);

      const nitKey = 'nit:900123456';
      expect(encodeSupplierKey(nitKey)).toBe('nit%3A900123456');
      expect(decodeSupplierKey('nit%3A900123456')).toBe(nitKey);
    });
  });

  describe('supplierTypeLabel', () => {
    it('muestra la etiqueta correspondiente', () => {
      expect(supplierTypeLabel('nombre:DIANA MARCELA PENA')).toBe('Persona natural');
      expect(supplierTypeLabel('nit:900123456')).toBe('Persona jurídica');
    });
  });
});
