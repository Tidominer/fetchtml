/**
 * Formatter registry for template value transformations.
 */

const formatters = new Map();

/**
 * Registers a formatter function.
 * @param {string} name - Formatter name
 * @param {Function} fn - Formatter function (value, args[], context) => transformed
 */
export function register(name, fn) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Formatter name must be a non-empty string.');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('Formatter must be a function.');
  }
  formatters.set(name, fn);
}

/**
 * Unregisters a formatter.
 * @param {string} name - Formatter name
 * @returns {boolean} True if formatter existed and was removed
 */
export function unregister(name) {
  return formatters.delete(name);
}

/**
 * Gets a formatter function by name.
 * @param {string} name - Formatter name
 * @returns {Function|undefined}
 */
export function get(name) {
  return formatters.get(name);
}

/**
 * Checks if a formatter exists.
 * @param {string} name - Formatter name
 * @returns {boolean}
 */
export function has(name) {
  return formatters.has(name);
}

/**
 * Applies a formatter to a value.
 * @param {string} name - Formatter name
 * @param {*} value - Value to format
 * @param {Array} args - Formatter arguments
 * @param {Object} context - Additional context (item, index, etc.)
 * @returns {*} Formatted value or original if formatter not found
 */
export function apply(name, value, args = [], context = {}) {
  const formatter = formatters.get(name);
  if (!formatter) {
    console.warn(`Formatter "${name}" not found. Returning original value.`);
    return value;
  }
  
  try {
    return formatter(value, args, context);
  } catch (error) {
    console.error(`Error applying formatter "${name}":`, error);
    return value;
  }
}

// Built-in formatters

/**
 * Converts value to uppercase.
 */
register('upper', (value) => {
  return String(value).toUpperCase();
});

/**
 * Converts value to lowercase.
 */
register('lower', (value) => {
  return String(value).toLowerCase();
});

/**
 * Capitalizes first letter.
 */
register('capitalize', (value) => {
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/**
 * Formats a number with specified decimal places.
 * Usage: {price|number(2)}
 */
register('number', (value, args) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  
  const decimals = args[0] !== undefined ? parseInt(args[0], 10) : 0;
  return num.toFixed(decimals);
});

/**
 * Formats a number as currency.
 * Usage: {price|currency(USD)}
 */
register('currency', (value, args) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  
  const currency = args[0] || 'USD';
  const locale = args[1] || 'en-US';
  
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      }).format(num);
    } catch (error) {
      console.warn('Currency formatting failed:', error);
    }
  }
  
  return `${currency} ${num.toFixed(2)}`;
});

/**
 * Formats a date.
 * Usage: {createdAt|date(YYYY-MM-DD)}
 * Simple format tokens: YYYY, MM, DD, HH, mm, ss
 */
register('date', (value, args) => {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return value;
  
  const format = args[0] || 'YYYY-MM-DD';
  
  const tokens = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => tokens[match]);
});

/**
 * Joins an array with a separator.
 * Usage: {tags|join(, )}
 */
register('join', (value, args) => {
  if (!Array.isArray(value)) return value;
  const separator = args[0] !== undefined ? args[0] : ', ';
  return value.join(separator);
});

/**
 * Truncates a string to specified length.
 * Usage: {description|truncate(100)}
 */
register('truncate', (value, args) => {
  const str = String(value);
  const length = args[0] !== undefined ? parseInt(args[0], 10) : 50;
  const suffix = args[1] !== undefined ? args[1] : '...';
  
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
});

/**
 * Returns default value if input is falsy.
 * Usage: {optional|default(N/A)}
 */
register('default', (value, args) => {
  return value || (args[0] !== undefined ? args[0] : '');
});

/**
 * Maps a value using key=value pairs.
 * Usage: {status|map(pending=Pending,active=Active)}
 */
register('map', (value, args) => {
  if (!args.length) return value;
  
  const mapping = {};
  args[0].split(',').forEach((pair) => {
    const [key, val] = pair.split('=').map(s => s.trim());
    if (key && val) mapping[key] = val;
  });
  
  return mapping[value] !== undefined ? mapping[value] : value;
});

/**
 * Encodes value for use in URLs.
 */
register('urlencode', (value) => {
  return encodeURIComponent(String(value));
});

/**
 * Encodes value for safe HTML output.
 */
register('escape', (value) => {
  const str = String(value);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
});
