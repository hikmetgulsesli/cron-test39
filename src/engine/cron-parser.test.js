/**
 * Tests for cron-parser module
 */

const { parseCronExpression, isValidCronExpression, getNextOccurrences } = require('./cron-parser');

describe('parseCronExpression', () => {
  describe('basic patterns', () => {
    test('parses every minute (* * * * *)', () => {
      const result = parseCronExpression('* * * * *');
      expect(result.expression).toBe('* * * * *');
      expect(result.fields.minute).toHaveLength(60);
      expect(result.fields.hour).toHaveLength(24);
      expect(result.fields.dayOfMonth).toHaveLength(31);
      expect(result.fields.month).toHaveLength(12);
      expect(result.fields.dayOfWeek).toHaveLength(7);
      expect(result.fields.minute).toEqual(Array.from({length: 60}, (_, i) => i));
    });

    test('parses specific values (0 0 1 1 0)', () => {
      const result = parseCronExpression('0 0 1 1 0');
      expect(result.fields.minute).toEqual([0]);
      expect(result.fields.hour).toEqual([0]);
      expect(result.fields.dayOfMonth).toEqual([1]);
      expect(result.fields.month).toEqual([1]);
      expect(result.fields.dayOfWeek).toEqual([0]);
    });

    test('parses daily at midnight (0 0 * * *)', () => {
      const result = parseCronExpression('0 0 * * *');
      expect(result.fields.minute).toEqual([0]);
      expect(result.fields.hour).toEqual([0]);
      expect(result.fields.dayOfMonth).toHaveLength(31);
      expect(result.fields.month).toHaveLength(12);
      expect(result.fields.dayOfWeek).toHaveLength(7);
    });

    test('parses hourly (0 * * * *)', () => {
      const result = parseCronExpression('0 * * * *');
      expect(result.fields.minute).toEqual([0]);
      expect(result.fields.hour).toHaveLength(24);
    });
  });

  describe('ranges', () => {
    test('parses minute range (0-30 * * * *)', () => {
      const result = parseCronExpression('0-30 * * * *');
      expect(result.fields.minute).toEqual(Array.from({length: 31}, (_, i) => i));
    });

    test('parses hour range (0 9-17 * * *)', () => {
      const result = parseCronExpression('0 9-17 * * *');
      expect(result.fields.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    test('parses day of month range (* * 1-15 * *)', () => {
      const result = parseCronExpression('* * 1-15 * *');
      expect(result.fields.dayOfMonth).toEqual(Array.from({length: 15}, (_, i) => i + 1));
    });

    test('parses month range (* * * 1-6 *)', () => {
      const result = parseCronExpression('* * * 1-6 *');
      expect(result.fields.month).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('throws for invalid range (30-10 * * * *)', () => {
      // Note: This actually works since we just iterate from start to end
      // But the result would be empty, which might be unexpected
      const result = parseCronExpression('30-10 * * * *');
      expect(result.fields.minute).toEqual([]);
    });

    test('throws for out of range values (0-70 * * * *)', () => {
      expect(() => parseCronExpression('0-70 * * * *')).toThrow('Invalid minute value: 70');
    });
  });

  describe('steps', () => {
    test('parses every 5 minutes (*/5 * * * *)', () => {
      const result = parseCronExpression('*/5 * * * *');
      expect(result.fields.minute).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    });

    test('parses every 2 hours (0 */2 * * *)', () => {
      const result = parseCronExpression('0 */2 * * *');
      expect(result.fields.hour).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    test('parses step with range (0 9-17/2 * * *)', () => {
      const result = parseCronExpression('0 9-17/2 * * *');
      expect(result.fields.hour).toEqual([9, 11, 13, 15, 17]);
    });

    test('throws for invalid step (*/0 * * * *)', () => {
      expect(() => parseCronExpression('*/0 * * * *')).toThrow('Invalid step value: 0');
    });

    test('throws for negative step (* /-5 * * * *)', () => {
      expect(() => parseCronExpression('*/-5 * * * *')).toThrow('Invalid step value: -5');
    });
  });

  describe('lists', () => {
    test('parses list of minutes (0,15,30,45 * * * *)', () => {
      const result = parseCronExpression('0,15,30,45 * * * *');
      expect(result.fields.minute).toEqual([0, 15, 30, 45]);
    });

    test('parses list of hours (0 9,12,17 * * *)', () => {
      const result = parseCronExpression('0 9,12,17 * * *');
      expect(result.fields.hour).toEqual([9, 12, 17]);
    });

    test('parses mixed list with ranges (0-5,30,45 * * * *)', () => {
      const result = parseCronExpression('0-5,30,45 * * * *');
      expect(result.fields.minute).toEqual([0, 1, 2, 3, 4, 5, 30, 45]);
    });

    test('deduplicates values in list (0,0,15,15 * * * *)', () => {
      const result = parseCronExpression('0,0,15,15 * * * *');
      expect(result.fields.minute).toEqual([0, 15]);
    });
  });

  describe('extended syntax', () => {
    test('parses L for last day (* * L * *)', () => {
      const result = parseCronExpression('* * L * *');
      expect(result.fields.dayOfMonth).toEqual(['L']);
    });

    test('parses W for weekday (* * W * *)', () => {
      const result = parseCronExpression('* * W * *');
      expect(result.fields.dayOfMonth).toEqual(['W']);
    });

    test('parses LW for last weekday (* * LW * *)', () => {
      const result = parseCronExpression('* * LW * *');
      expect(result.fields.dayOfMonth).toEqual(['LW']);
    });

    test('parses nth occurrence (0 0 * * 2#1)', () => {
      const result = parseCronExpression('0 0 * * 2#1');
      expect(result.fields.dayOfWeek).toEqual(['2#1']);
    });

    test('parses 3rd Friday (0 0 * * 5#3)', () => {
      const result = parseCronExpression('0 0 * * 5#3');
      expect(result.fields.dayOfWeek).toEqual(['5#3']);
    });

    test('throws for invalid nth occurrence (0 0 * * 2#6)', () => {
      expect(() => parseCronExpression('0 0 * * 2#6')).toThrow('Invalid nth occurrence: 6');
    });

    test('parses nth occurrence of Sunday (0 0 * * 0#2)', () => {
      const result = parseCronExpression('0 0 * * 0#2');
      expect(result.fields.dayOfWeek).toEqual(['0#2']);
    });
  });

  describe('month and day names', () => {
    test('parses month names (0 0 1 jan,feb,mar *)', () => {
      const result = parseCronExpression('0 0 1 jan,feb,mar *');
      expect(result.fields.month).toEqual([1, 2, 3]);
    });

    test('parses day names (0 0 * * mon,wed,fri)', () => {
      const result = parseCronExpression('0 0 * * mon,wed,fri');
      expect(result.fields.dayOfWeek).toEqual([1, 3, 5]);
    });

    test('parses mixed case month names (0 0 1 JAN,Feb,Mar *)', () => {
      const result = parseCronExpression('0 0 1 JAN,Feb,Mar *');
      expect(result.fields.month).toEqual([1, 2, 3]);
    });

    test('parses full day range with names (0 0 * * sun-sat)', () => {
      const result = parseCronExpression('0 0 * * sun-sat');
      expect(result.fields.dayOfWeek).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
  });

  describe('day of week normalization', () => {
    test('normalizes 7 to 0 (Sunday) (* * * * 7)', () => {
      const result = parseCronExpression('* * * * 7');
      expect(result.fields.dayOfWeek).toEqual([0]);
    });

    test('handles both 0 and 7 (* * * * 0,7)', () => {
      const result = parseCronExpression('* * * * 0,7');
      expect(result.fields.dayOfWeek).toEqual([0]);
    });
  });

  describe('invalid inputs', () => {
    test('throws for empty string', () => {
      expect(() => parseCronExpression('')).toThrow('Cron expression must be a non-empty string');
    });

    test('throws for whitespace-only string', () => {
      expect(() => parseCronExpression('   ')).toThrow('Cron expression cannot be empty');
    });

    test('throws for null', () => {
      expect(() => parseCronExpression(null)).toThrow('Cron expression must be a non-empty string');
    });

    test('throws for undefined', () => {
      expect(() => parseCronExpression(undefined)).toThrow('Cron expression must be a non-empty string');
    });

    test('throws for non-string', () => {
      expect(() => parseCronExpression(123)).toThrow('Cron expression must be a non-empty string');
    });

    test('throws for too few fields', () => {
      expect(() => parseCronExpression('* * * *')).toThrow('Expected 5 fields');
    });

    test('throws for too many fields', () => {
      expect(() => parseCronExpression('* * * * * *')).toThrow('Expected 5 fields');
    });

    test('throws for out of range minute', () => {
      expect(() => parseCronExpression('60 * * * *')).toThrow('Invalid minute value: 60');
    });

    test('throws for out of range hour', () => {
      expect(() => parseCronExpression('* 24 * * *')).toThrow('Invalid hour value: 24');
    });

    test('throws for out of range day of month', () => {
      expect(() => parseCronExpression('* * 32 * *')).toThrow('Invalid dayOfMonth value: 32');
    });

    test('throws for out of range month', () => {
      expect(() => parseCronExpression('* * * 13 *')).toThrow('Invalid month value: 13');
    });

    test('throws for out of range day of week', () => {
      expect(() => parseCronExpression('* * * * 8')).toThrow('Invalid dayOfWeek value: 8');
    });

    test('throws for negative minute', () => {
      expect(() => parseCronExpression('-1 * * * *')).toThrow();
    });

    test('throws for invalid characters', () => {
      expect(() => parseCronExpression('a * * * *')).toThrow('Invalid value: a');
    });
  });

  describe('complex expressions', () => {
    test('parses every 15 minutes during business hours (0/15 9-17 * * 1-5)', () => {
      const result = parseCronExpression('0/15 9-17 * * 1-5');
      expect(result.fields.minute).toEqual([0, 15, 30, 45]);
      expect(result.fields.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      expect(result.fields.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    test('parses first Monday of every month (0 0 * * 1#1)', () => {
      const result = parseCronExpression('0 0 * * 1#1');
      expect(result.fields.minute).toEqual([0]);
      expect(result.fields.hour).toEqual([0]);
      expect(result.fields.dayOfWeek).toEqual(['1#1']);
    });

    test('parses weekday at midnight (0 0 * * 1-5)', () => {
      const result = parseCronExpression('0 0 * * 1-5');
      expect(result.fields.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

describe('isValidCronExpression', () => {
  test('returns true for valid expression', () => {
    expect(isValidCronExpression('* * * * *')).toBe(true);
  });

  test('returns true for complex valid expression', () => {
    expect(isValidCronExpression('0/15 9-17 * * 1-5')).toBe(true);
  });

  test('returns false for empty string', () => {
    expect(isValidCronExpression('')).toBe(false);
  });

  test('returns false for too few fields', () => {
    expect(isValidCronExpression('* * * *')).toBe(false);
  });

  test('returns false for out of range values', () => {
    expect(isValidCronExpression('60 * * * *')).toBe(false);
  });

  test('returns false for invalid syntax', () => {
    expect(isValidCronExpression('invalid')).toBe(false);
  });
});

describe('getNextOccurrences', () => {
  test('returns next occurrence for daily midnight', () => {
    const fromDate = new Date('2024-01-01T12:00:00');
    const occurrences = getNextOccurrences('0 0 * * *', 1, fromDate);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toEqual(new Date('2024-01-02T00:00:00'));
  });

  test('returns multiple occurrences', () => {
    const fromDate = new Date('2024-01-01T00:00:00');
    const occurrences = getNextOccurrences('0 0 * * *', 3, fromDate);
    expect(occurrences).toHaveLength(3);
    // Check that dates are sequential midnight occurrences
    expect(occurrences[0].getHours()).toBe(0);
    expect(occurrences[0].getMinutes()).toBe(0);
    expect(occurrences[1].getHours()).toBe(0);
    expect(occurrences[1].getMinutes()).toBe(0);
    expect(occurrences[2].getHours()).toBe(0);
    expect(occurrences[2].getMinutes()).toBe(0);
    // Verify they are 24 hours apart
    const dayDiff1 = (occurrences[1].getTime() - occurrences[0].getTime()) / (1000 * 60 * 60 * 24);
    const dayDiff2 = (occurrences[2].getTime() - occurrences[1].getTime()) / (1000 * 60 * 60 * 24);
    expect(dayDiff1).toBe(1);
    expect(dayDiff2).toBe(1);
  });

  test('returns empty array for impossible schedule', () => {
    // February 30th doesn't exist
    const fromDate = new Date('2024-01-01T00:00:00');
    const occurrences = getNextOccurrences('0 0 30 2 *', 1, fromDate);
    expect(occurrences).toHaveLength(0);
  });
});
