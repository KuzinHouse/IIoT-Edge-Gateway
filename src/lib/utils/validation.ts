/**
 * Validation Utilities - Form and data validation helpers
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
  code: string;
}

// ============================================================================
// Basic Validators
// ============================================================================

/**
 * Check if value is not empty
 */
export function required(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid IP address (IPv4)
 */
export function isIPv4(value: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(value)) return false;
  
  const parts = value.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
}

/**
 * Check if value is a valid IP address (IPv6)
 */
export function isIPv6(value: string): boolean {
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(value);
}

/**
 * Check if value is a valid port number
 */
export function isPort(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is an integer
 */
export function isInteger(value: unknown): boolean {
  return Number.isInteger(value);
}

/**
 * Check if value is a positive number
 */
export function isPositive(value: number): boolean {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a non-negative number
 */
export function isNonNegative(value: number): boolean {
  return isNumber(value) && value >= 0;
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Check if value has minimum length
 */
export function minLength(value: string | unknown[], min: number): boolean {
  return value.length >= min;
}

/**
 * Check if value has maximum length
 */
export function maxLength(value: string | unknown[], max: number): boolean {
  return value.length <= max;
}

/**
 * Check if value matches a regex pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Check if value is alphanumeric
 */
export function isAlphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value);
}

/**
 * Check if value is a valid hex color
 */
export function isHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

/**
 * Check if value is a valid JSON string
 */
export function isJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Modbus-specific Validators
// ============================================================================

/**
 * Check if value is a valid Modbus slave ID (1-247)
 */
export function isSlaveId(value: number): boolean {
  return isInteger(value) && value >= 1 && value <= 247;
}

/**
 * Check if value is a valid register address (0-65535)
 */
export function isRegisterAddress(value: number): boolean {
  return isInteger(value) && value >= 0 && value <= 65535;
}

/**
 * Check if value is a valid baud rate
 */
export function isBaudRate(value: number): boolean {
  const validBaudRates = [9600, 19200, 38400, 57600, 115200];
  return validBaudRates.includes(value);
}

/**
 * Check if value is a valid data bits setting
 */
export function isDataBits(value: number): boolean {
  return [5, 6, 7, 8].includes(value);
}

/**
 * Check if value is a valid stop bits setting
 */
export function isStopBits(value: number): boolean {
  return [1, 2].includes(value);
}

/**
 * Check if value is a valid parity setting
 */
export function isParity(value: string): boolean {
  return ['none', 'even', 'odd'].includes(value);
}

/**
 * Check if value is a valid serial port path
 */
export function isSerialPort(value: string): boolean {
  // Linux: /dev/ttyUSB0, /dev/ttyS0, /dev/ttyACM0
  // Windows: COM1, COM2, etc.
  const linuxPattern = /^\/dev\/tty(USB|S|ACM|M)[0-9]+$/;
  const windowsPattern = /^COM[0-9]+$/;
  return linuxPattern.test(value) || windowsPattern.test(value);
}

/**
 * Check if value is a valid timeout (in milliseconds)
 */
export function isTimeout(value: number): boolean {
  return isPositive(value) && value <= 30000; // Max 30 seconds
}

/**
 * Check if value is a valid host (IP or hostname)
 */
export function isHost(value: string): boolean {
  if (isIPv4(value) || isIPv6(value)) return true;
  
  // Check for valid hostname
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  return hostnameRegex.test(value);
}

// ============================================================================
// Validation Builder
// ============================================================================

export class Validator {
  private errors: ValidationError[] = [];
  private field: string = '';

  forField(field: string): this {
    this.field = field;
    return this;
  }

  addError(message: string, code: string): this {
    this.errors.push({ field: this.field, message, code });
    return this;
  }

  validate(value: unknown, rules: ValidationRule[]): this {
    for (const rule of rules) {
      if (!rule.validate(value)) {
        this.addError(rule.message, rule.code);
        break;
      }
    }
    return this;
  }

  required(message = 'This field is required'): this {
    return this.addRule(required, message, 'required');
  }

  email(message = 'Invalid email address'): this {
    return this.addRule(isEmail, message, 'email');
  }

  url(message = 'Invalid URL'): this {
    return this.addRule(isUrl, message, 'url');
  }

  min(min: number, message?: string): this {
    return this.addRule(
      (v: number) => v >= min,
      message || `Minimum value is ${min}`,
      'min'
    );
  }

  max(max: number, message?: string): this {
    return this.addRule(
      (v: number) => v <= max,
      message || `Maximum value is ${max}`,
      'max'
    );
  }

  minLength(min: number, message?: string): this {
    return this.addRule(
      (v: string) => v.length >= min,
      message || `Minimum length is ${min}`,
      'minLength'
    );
  }

  maxLength(max: number, message?: string): this {
    return this.addRule(
      (v: string) => v.length <= max,
      message || `Maximum length is ${max}`,
      'maxLength'
    );
  }

  pattern(regex: RegExp, message = 'Invalid format'): this {
    return this.addRule(
      (v: string) => regex.test(v),
      message,
      'pattern'
    );
  }

  private addRule(validate: (value: unknown) => boolean, message: string, code: string): this {
    // This is just a placeholder - actual validation would be done elsewhere
    return this;
  }

  getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  getErrors(): ValidationError[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  reset(): this {
    this.errors = [];
    this.field = '';
    return this;
  }
}

// ============================================================================
// Form Validation Helper
// ============================================================================

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, ValidationRule<unknown>[]>>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (fieldRules) {
      const value = data[field];
      for (const rule of fieldRules) {
        if (!rule.validate(value)) {
          errors.push({
            field,
            message: rule.message,
            code: rule.code,
          });
          break; // Stop at first error per field
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Common Validation Rules
// ============================================================================

export const commonRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: required,
    message,
    code: 'required',
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: isEmail,
    message,
    code: 'email',
  }),

  url: (message = 'Invalid URL'): ValidationRule<string> => ({
    validate: isUrl,
    message,
    code: 'url',
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (v: number) => v >= min,
    message: message || `Minimum value is ${min}`,
    code: 'min',
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (v: number) => v <= max,
    message: message || `Maximum value is ${max}`,
    code: 'max',
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (v: string) => v.length >= min,
    message: message || `Minimum length is ${min}`,
    code: 'minLength',
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (v: string) => v.length <= max,
    message: message || `Maximum length is ${max}`,
    code: 'maxLength',
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (v: string) => regex.test(v),
    message,
    code: 'pattern',
  }),
};

export const modbusRules = {
  slaveId: (message = 'Slave ID must be between 1 and 247'): ValidationRule<number> => ({
    validate: isSlaveId,
    message,
    code: 'slaveId',
  }),

  registerAddress: (message = 'Register address must be between 0 and 65535'): ValidationRule<number> => ({
    validate: isRegisterAddress,
    message,
    code: 'registerAddress',
  }),

  baudRate: (message = 'Invalid baud rate'): ValidationRule<number> => ({
    validate: isBaudRate,
    message,
    code: 'baudRate',
  }),

  host: (message = 'Invalid host'): ValidationRule<string> => ({
    validate: isHost,
    message,
    code: 'host',
  }),

  port: (message = 'Port must be between 1 and 65535'): ValidationRule<number> => ({
    validate: isPort,
    message,
    code: 'port',
  }),

  serialPort: (message = 'Invalid serial port path'): ValidationRule<string> => ({
    validate: isSerialPort,
    message,
    code: 'serialPort',
  }),
};

const validators = {
  // Basic validators
  required,
  isEmail,
  isUrl,
  isIPv4,
  isIPv6,
  isPort,
  isNumber,
  isInteger,
  isPositive,
  isNonNegative,
  isInRange,
  minLength,
  maxLength,
  matchesPattern,
  isAlphanumeric,
  isHexColor,
  isJSON,

  // Modbus validators
  isSlaveId,
  isRegisterAddress,
  isBaudRate,
  isDataBits,
  isStopBits,
  isParity,
  isSerialPort,
  isTimeout,
  isHost,

  // Helpers
  Validator,
  validateForm,
  commonRules,
  modbusRules,
};

export default validators;
