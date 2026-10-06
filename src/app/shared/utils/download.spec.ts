import { filenameFromContentDisposition, saveBlob } from './download';

describe('filenameFromContentDisposition', () => {
  it('lee filename entre comillas', () => {
    expect(
      filenameFromContentDisposition('attachment; filename="processes-2026-10-05.csv"', 'x.csv'),
    ).toBe('processes-2026-10-05.csv');
  });

  it('lee filename sin comillas', () => {
    expect(filenameFromContentDisposition('attachment; filename=contratos.csv', 'x.csv')).toBe(
      'contratos.csv',
    );
  });

  it('prefiere filename* (RFC 5987) y decodifica UTF-8', () => {
    const header = `attachment; filename="licitaciones.csv"; filename*=UTF-8''licitaciones%20cajic%C3%A1.csv`;
    expect(filenameFromContentDisposition(header, 'x.csv')).toBe('licitaciones cajicá.csv');
  });

  it('quita rutas del nombre', () => {
    expect(filenameFromContentDisposition('attachment; filename="../../etc/passwd"', 'x.csv')).toBe(
      'passwd',
    );
  });

  it('sin cabecera o sin nombre usa el de respaldo', () => {
    expect(filenameFromContentDisposition(null, 'contratos.csv')).toBe('contratos.csv');
    expect(filenameFromContentDisposition('inline', 'contratos.csv')).toBe('contratos.csv');
  });
});

describe('saveBlob', () => {
  it('crea un enlace de descarga temporal y lo pulsa', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    saveBlob(new Blob(['a;b']), 'datos.csv');

    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('datos.csv');
    expect(link.href).toBe('blob:test');
    expect(document.querySelector('a[download]')).toBeNull();
    click.mockRestore();
  });
});
