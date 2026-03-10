/**
 * Cron Expression Parser Module
 * 
 * Parses and validates standard cron expressions with extended syntax support.
 * Supports: * (all), / (step), - (range), comma (list), L (last), W (weekday), # (nth)
 */

const FIELD_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 }, // 0 and 7 are both Sunday
};

const MONTH_NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const DAY_NAMES = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

/**
 * Validates that a value is within the allowed range for a field
 * @param {number} value
 * @param {string} fieldName
 */
function validateRange(value, fieldName) {
  const range = FIELD_RANGES[fieldName];
  if (value < range.min || value > range.max) {
    throw new Error(
      `Invalid ${fieldName} value: ${value}. Must be between ${range.min} and ${range.max}`
    );
  }
}

/**
 * Converts month/day names to their numeric values
 * @param {string} value
 * @param {string} fieldName
 * @returns {number|string}
 */
function parseValue(value, fieldName) {
  const lowerValue = value.toLowerCase();
  
  if (fieldName === 'month' && MONTH_NAMES[lowerValue] !== undefined) {
    return MONTH_NAMES[lowerValue];
  }
  
  if (fieldName === 'dayOfWeek' && DAY_NAMES[lowerValue] !== undefined) {
    return DAY_NAMES[lowerValue];
  }
  
  // Handle special characters L, W, #
  if (['L', 'W', '#'].includes(value)) {
    return value;
  }
  
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid value: ${value}`);
  }
  
  return num;
}

/**
 * Parses a single field value and returns expanded array of values
 * @param {string} fieldValue
 * @param {string} fieldName
 * @returns {(number|string)[]}
 */
function parseFieldValue(fieldValue, fieldName) {
  const range = FIELD_RANGES[fieldName];
  const results = [];

  // Handle list (comma-separated values)
  if (fieldValue.includes(',')) {
    const parts = fieldValue.split(',');
    for (const part of parts) {
      results.push(...parseFieldValue(part.trim(), fieldName));
    }
    return [...new Set(results)].sort((a, b) => Number(a) - Number(b));
  }

  // Handle step values (e.g., */5, 1-10/2)
  if (fieldValue.includes('/')) {
    const [base, stepStr] = fieldValue.split('/');
    const step = parseInt(stepStr, 10);
    
    if (isNaN(step) || step < 1) {
      throw new Error(`Invalid step value: ${stepStr}`);
    }

    let start = range.min;
    let end = range.max;

    if (base !== '*') {
      if (base.includes('-')) {
        const [startStr, endStr] = base.split('-');
        start = Number(parseValue(startStr, fieldName));
        end = Number(parseValue(endStr, fieldName));
      } else {
        start = Number(parseValue(base, fieldName));
      }
    }

    validateRange(start, fieldName);
    validateRange(end, fieldName);

    for (let i = start; i <= end; i += step) {
      results.push(i);
    }
    return results;
  }

  // Handle range (e.g., 1-5)
  if (fieldValue.includes('-')) {
    const [startStr, endStr] = fieldValue.split('-');
    const start = Number(parseValue(startStr, fieldName));
    const end = Number(parseValue(endStr, fieldName));
    
    validateRange(start, fieldName);
    validateRange(end, fieldName);

    for (let i = start; i <= end; i++) {
      results.push(i);
    }
    return results;
  }

  // Handle asterisk (all values)
  if (fieldValue === '*') {
    for (let i = range.min; i <= range.max; i++) {
      results.push(i);
    }
    return results;
  }

  // Handle special characters L, W
  if (fieldValue === 'L' || fieldValue === 'W' || fieldValue.endsWith('L') || fieldValue.endsWith('W')) {
    return [fieldValue];
  }

  // Handle nth occurrence (e.g., 2#3 for 3rd Tuesday)
  if (fieldValue.includes('#')) {
    const [dayStr, nthStr] = fieldValue.split('#');
    const day = Number(parseValue(dayStr, fieldName));
    const nth = parseInt(nthStr, 10);
    
    if (isNaN(nth) || nth < 1 || nth > 5) {
      throw new Error(`Invalid nth occurrence: ${nthStr}. Must be between 1 and 5`);
    }
    
    validateRange(day, fieldName);
    return [`${day}#${nth}`];
  }

  // Single value
  const parsedValue = parseValue(fieldValue, fieldName);
  if (typeof parsedValue === 'number') {
    validateRange(parsedValue, fieldName);
  }
  results.push(parsedValue);

  return results;
}

/**
 * Parses a cron expression and returns the expanded field values
 * @param {string} expression - The cron expression to parse (e.g., "0 0 * * *")
 * @returns {ParsedCronExpression} ParsedCronExpression with expanded fields
 * @throws {Error} if the expression is invalid
 */
function parseCronExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Cron expression must be a non-empty string');
  }

  const trimmedExpression = expression.trim();
  
  if (trimmedExpression === '') {
    throw new Error('Cron expression cannot be empty');
  }

  // Split expression into fields
  const fields = trimmedExpression.split(/\s+/);
  
  if (fields.length !== 5) {
    throw new Error(
      `Invalid cron expression: "${expression}". Expected 5 fields (minute hour day month dayOfWeek), got ${fields.length}`
    );
  }

  const fieldNames = [
    'minute',
    'hour',
    'dayOfMonth',
    'month',
    'dayOfWeek'
  ];

  const parsedFields = {
    minute: [],
    hour: [],
    dayOfMonth: [],
    month: [],
    dayOfWeek: []
  };

  for (let i = 0; i < 5; i++) {
    const fieldValue = fields[i];
    const fieldName = fieldNames[i];
    
    try {
      const parsed = parseFieldValue(fieldValue, fieldName);
      // Convert all values to numbers where possible, keeping special strings
      parsedFields[fieldName] = parsed.map(v => {
        if (typeof v === 'string' && !isNaN(Number(v))) {
          return Number(v);
        }
        return v;
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error parsing ${fieldName}: ${error.message}`);
      }
      throw error;
    }
  }

  // Normalize dayOfWeek: both 0 and 7 represent Sunday
  if (parsedFields.dayOfWeek.includes(7)) {
    if (!parsedFields.dayOfWeek.includes(0)) {
      parsedFields.dayOfWeek.push(0);
    }
    parsedFields.dayOfWeek = parsedFields.dayOfWeek.filter(v => v !== 7);
    parsedFields.dayOfWeek.sort((a, b) => a - b);
  }

  return {
    expression: trimmedExpression,
    fields: parsedFields
  };
}

/**
 * Validates a cron expression without throwing
 * @param {string} expression - The cron expression to validate
 * @returns {boolean} true if valid, false otherwise
 */
function isValidCronExpression(expression) {
  try {
    parseCronExpression(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the next occurrence(s) of a cron expression
 * Note: This is a simplified implementation for basic use cases
 * @param {string} expression
 * @param {number} count
 * @param {Date} fromDate
 * @returns {Date[]}
 */
function getNextOccurrences(
  expression,
  count = 1,
  fromDate = new Date()
) {
  const parsed = parseCronExpression(expression);
  const occurrences = [];
  
  let currentDate = new Date(fromDate);
  currentDate.setMilliseconds(0);
  currentDate.setSeconds(0);
  
  // Simple brute force approach: check each minute up to 4 years
  const maxIterations = 366 * 24 * 60 * 4; // ~4 years in minutes
  let iterations = 0;
  
  while (occurrences.length < count && iterations < maxIterations) {
    const minute = currentDate.getMinutes();
    const hour = currentDate.getHours();
    const dayOfMonth = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // JS months are 0-indexed
    const dayOfWeek = currentDate.getDay();
    
    // Check if current time matches all fields
    const matchesMinute = parsed.fields.minute.includes(minute);
    const matchesHour = parsed.fields.hour.includes(hour);
    const matchesDayOfMonth = parsed.fields.dayOfMonth.includes(dayOfMonth) ||
                              parsed.fields.dayOfMonth.some(v => typeof v === 'string' && v.startsWith('L'));
    const matchesMonth = parsed.fields.month.includes(month);
    const matchesDayOfWeek = parsed.fields.dayOfWeek.includes(dayOfWeek) ||
                             parsed.fields.dayOfWeek.some(v => typeof v === 'string' && v.includes('#'));
    
    if (matchesMinute && matchesHour && matchesDayOfMonth && matchesMonth && matchesDayOfWeek) {
      occurrences.push(new Date(currentDate));
    }
    
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    iterations++;
  }
  
  return occurrences;
}

module.exports = {
  parseCronExpression,
  isValidCronExpression,
  getNextOccurrences
};
