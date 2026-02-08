import { isPropertyActive, extractArea } from './propertyHelpers';
import type { Property } from '../types/database';

// Factoría mínima de Property — solo contract_end importa para isPropertyActive
const makeProperty = (overrides: Partial<Property> = {}): Property => ({
  id: 1,
  name: 'Test',
  address: 'Test',
  capacity: 2,
  rent_cost: 50000,
  rent_price_uns: 60000,
  parking_cost: 0,
  ...overrides,
});

// ============ isPropertyActive ============

describe('isPropertyActive', () => {
  it('returns true when contract_end is undefined', () => {
    const p = makeProperty({ contract_end: undefined });
    expect(isPropertyActive(p)).toBe(true);
  });

  it('returns true when contract_end is empty string', () => {
    const p = makeProperty({ contract_end: '' });
    expect(isPropertyActive(p)).toBe(true);
  });

  it('returns true when contract_end is in the future', () => {
    const p = makeProperty({ contract_end: '2099-12-31' });
    expect(isPropertyActive(p)).toBe(true);
  });

  it('returns false when contract_end is in the past', () => {
    const p = makeProperty({ contract_end: '2020-01-01' });
    expect(isPropertyActive(p)).toBe(false);
  });

  describe('contract_end is today (edge cases with fake timers)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false when current time is midday (midnight < midday)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const p = makeProperty({ contract_end: '2024-06-15' });
      // new Date('2024-06-15') = 2024-06-15T00:00:00Z (midnight)
      // new Date() = 2024-06-15T12:00:00Z (midday) → midnight is NOT > midday
      expect(isPropertyActive(p)).toBe(false);
    });

    it('returns false even when current time is exactly midnight UTC', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T00:00:00.000Z'));

      const p = makeProperty({ contract_end: '2024-06-15' });
      // Both resolve to exactly the same timestamp → d is NOT > new Date()
      expect(isPropertyActive(p)).toBe(false);
    });
  });

  it('returns true when contract_end is an invalid date string (NaN check)', () => {
    const p = makeProperty({ contract_end: 'not-a-date' });
    expect(isPropertyActive(p)).toBe(true);
  });

  it('returns true when contract_end is a random non-date string', () => {
    const p = makeProperty({ contract_end: 'abc123' });
    expect(isPropertyActive(p)).toBe(true);
  });
});

// ============ extractArea ============

describe('extractArea', () => {
  it('extracts city (市) from full Japanese address', () => {
    const result = extractArea('', '愛知県名古屋市東区徳川2-18-18');
    // Regex matches first occurrence ending in 市: "愛知県名古屋市"
    expect(result).toContain('名古屋市');
  });

  it('extracts ward (区) from Tokyo-style address', () => {
    const result = extractArea('', '東京都渋谷区神宮前1-1');
    // 都 is not in [市区町村郡], so regex continues to 区: "東京都渋谷区"
    expect(result).toContain('渋谷区');
  });

  it('extracts town (町) from address without preceding 市/区/郡', () => {
    const result = extractArea('', '神奈川県大磯町東小磯1-1');
    // No 市/区/郡 before 町, so first match ends at 町: "神奈川県大磯町"
    expect(result).toContain('大磯町');
  });

  it('matches 郡 before 町 when both are in the address', () => {
    const result = extractArea('', '埼玉県入間郡三芳町藤久保');
    // 郡 appears before 町 → regex matches "埼玉県入間郡" first
    expect(result).toBe('埼玉県入間郡');
  });

  it('strips postal code (〒NNN-NNNN) before extracting area', () => {
    const result = extractArea('', '〒461-0025 愛知県名古屋市東区徳川2-18-18');
    expect(result).toContain('名古屋市');
    expect(result).not.toContain('〒');
    expect(result).not.toContain('461');
  });

  it('strips postal code without 〒 prefix', () => {
    const result = extractArea('', '461-0025 愛知県名古屋市東区徳川');
    expect(result).toContain('名古屋市');
  });

  it('returns empty string for empty address', () => {
    expect(extractArea('', '')).toBe('');
  });

  it('falls back to first space-delimited segment when no city pattern matches', () => {
    const result = extractArea('', 'SomeArea SomeDetail');
    expect(result).toBe('SomeArea');
  });

  it('returns substring(0,6) when no city pattern and no spaces', () => {
    const result = extractArea('', 'ABCDEFGHIJ');
    expect(result).toBe('ABCDEF');
  });

  it('ignores the _name parameter entirely', () => {
    const result1 = extractArea('', '東京都渋谷区神宮前');
    const result2 = extractArea('SomeName', '東京都渋谷区神宮前');
    const result3 = extractArea('anything-else', '東京都渋谷区神宮前');
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});
