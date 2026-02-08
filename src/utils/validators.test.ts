import { validateProperty, validateTenant } from './validators';

// ============ validateProperty ============

describe('validateProperty', () => {
  const validProperty = {
    name: 'Apartamento Test',
    address: 'Tokyo-to Shibuya-ku 1-1-1',
    capacity: 4,
    rent_cost: 80000,
    rent_price_uns: 95000,
    parking_cost: 5000,
  };

  it('returns success for valid property data', () => {
    const result = validateProperty(validProperty);
    expect(result.success).toBe(true);
  });

  it('returns success with all optional fields included', () => {
    const result = validateProperty({
      ...validProperty,
      room_number: '201',
      postal_code: '150-0001',
      address_auto: 'Tokyo-to',
      address_detail: 'Shibuya 1-1',
      type: '2LDK',
      kanri_hi: 3000,
      billing_mode: 'split',
      manager_name: 'Yamada',
      manager_phone: '03-1234-5678',
      contract_start: '2024-04-01',
      contract_end: '2025-03-31',
    });
    expect(result.success).toBe(true);
  });

  it('returns error when name is missing', () => {
    const { name, ...noName } = validProperty;
    const result = validateProperty(noName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    }
  });

  it('returns error when name is too short (min 2 chars)', () => {
    const result = validateProperty({ ...validProperty, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    }
  });

  it('returns error when address is missing', () => {
    const { address, ...noAddr } = validProperty;
    const result = validateProperty(noAddr);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'address')).toBe(true);
    }
  });

  it('returns error for negative capacity', () => {
    const result = validateProperty({ ...validProperty, capacity: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'capacity')).toBe(true);
    }
  });

  it('returns error for zero capacity (min is 1)', () => {
    const result = validateProperty({ ...validProperty, capacity: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'capacity')).toBe(true);
    }
  });

  it('returns error for capacity exceeding max (20)', () => {
    const result = validateProperty({ ...validProperty, capacity: 21 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'capacity')).toBe(true);
    }
  });

  it('returns error for negative rent_cost', () => {
    const result = validateProperty({ ...validProperty, rent_cost: -100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'rent_cost')).toBe(true);
    }
  });

  it('returns error for negative parking_cost', () => {
    const result = validateProperty({ ...validProperty, parking_cost: -500 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'parking_cost')).toBe(true);
    }
  });

  it('accepts zero values for cost fields', () => {
    const result = validateProperty({
      ...validProperty,
      rent_cost: 0,
      rent_price_uns: 0,
      parking_cost: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ============ validateTenant ============

describe('validateTenant', () => {
  const validTenant = {
    employee_id: 'E001',
    name: 'Tanaka Taro',
    property_id: 1,
    rent_contribution: 30000,
    parking_fee: 5000,
  };

  it('returns success for valid tenant data', () => {
    const result = validateTenant(validTenant);
    expect(result.success).toBe(true);
  });

  it('returns success with all optional fields included', () => {
    const result = validateTenant({
      ...validTenant,
      name_kana: 'タナカ タロウ',
      company: 'UNS-KIKAKU',
      entry_date: '2024-04-01',
      exit_date: '2025-03-31',
      cleaning_fee: 25000,
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('returns error when employee_id is missing', () => {
    const { employee_id, ...noId } = validTenant;
    const result = validateTenant(noId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'employee_id')).toBe(true);
    }
  });

  it('returns error when employee_id is empty string', () => {
    const result = validateTenant({ ...validTenant, employee_id: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'employee_id')).toBe(true);
    }
  });

  it('returns error when name is missing', () => {
    const { name, ...noName } = validTenant;
    const result = validateTenant(noName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    }
  });

  it('returns error when name is empty string', () => {
    const result = validateTenant({ ...validTenant, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    }
  });

  it('returns error for invalid property_id (negative)', () => {
    const result = validateTenant({ ...validTenant, property_id: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'property_id')).toBe(true);
    }
  });

  it('returns error for zero property_id (must be positive)', () => {
    const result = validateTenant({ ...validTenant, property_id: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'property_id')).toBe(true);
    }
  });

  it('returns error for negative rent_contribution', () => {
    const result = validateTenant({ ...validTenant, rent_contribution: -500 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'rent_contribution')).toBe(true);
    }
  });

  it('returns error for negative parking_fee', () => {
    const result = validateTenant({ ...validTenant, parking_fee: -100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'parking_fee')).toBe(true);
    }
  });

  it('applies default values for name_kana and status when omitted', () => {
    const result = validateTenant(validTenant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name_kana).toBe('');
      expect(result.data.status).toBe('active');
    }
  });
});
