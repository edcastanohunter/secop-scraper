import { parseRetryAfter } from './retry-after';

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('lee segundos', () => {
    expect(parseRetryAfter('30', now)).toBe(30);
    expect(parseRetryAfter(' 0 ', now)).toBe(0);
  });

  it('lee una fecha HTTP', () => {
    expect(parseRetryAfter('Sun, 04 Oct 2026 12:01:30 GMT', now)).toBe(90);
  });

  it('una fecha pasada da 0', () => {
    expect(parseRetryAfter('Sun, 04 Oct 2026 11:00:00 GMT', now)).toBe(0);
  });

  it.each([null, '', 'pronto', '-5'])('devuelve null para %j', (header) => {
    expect(parseRetryAfter(header, now)).toBeNull();
  });
});
