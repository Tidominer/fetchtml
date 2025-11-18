/**
 * Shared helper utilities for DOM manipulation and query operations.
 */

const hasCssEscape = typeof CSS !== 'undefined' && typeof CSS.escape === 'function';
const SPECIAL_CHARS_REGEX = /([\0-\x1F\x7F-\x9F\s!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g;
const slice = Array.prototype.slice;

/**
 * Validates and resolves a DOM node scope.
 * @param {*} scope - Node to validate
 * @returns {Document|Element|DocumentFragment}
 * @throws {TypeError} if scope is not a valid DOM node
 */
export function resolveScope(scope) {
  if (!scope) {
    return document;
  }

  const nodeType = scope.nodeType;
  if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
    return scope;
  }

  throw new TypeError('Context must be a DOM node when provided.');
}

/**
 * Escapes a class token for use in a CSS selector.
 * @param {string} token - Class name to escape
 * @returns {string}
 */
function escapeClassToken(token) {
  if (hasCssEscape) {
    return CSS.escape(token);
  }

  return token.replace(SPECIAL_CHARS_REGEX, '\\$1');
}

/**
 * Builds a multi-class selector from space-separated class names.
 * @param {string} value - Space-separated class names
 * @returns {string} - Combined selector like .foo.bar
 */
export function buildClassSelector(value) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return '';
  }

  return tokens.map((token) => `.${escapeClassToken(token)}`).join('');
}

/**
 * Escapes a selector value for querySelector.
 * @param {string} prefix - Selector prefix (#, ., or empty)
 * @param {string} value - Selector value
 * @returns {string}
 */
export function escapeForQuery(prefix, value) {
  if (!value) {
    return prefix;
  }

  if (prefix === '.') {
    const selector = buildClassSelector(value);
    return selector || prefix;
  }

  if (hasCssEscape) {
    return prefix + CSS.escape(value);
  }

  return prefix + value.replace(SPECIAL_CHARS_REGEX, '\\$1');
}

/**
 * Converts array-like collection to a real array.
 * @param {*} collection - Array-like object
 * @returns {Array}
 */
export function toArray(collection) {
  if (!collection || typeof collection.length !== 'number') {
    return [];
  }

  return slice.call(collection);
}

/**
 * Safely queries a single element with fallback.
 * @param {ParentNode} scope - Node to query within
 * @param {string} prefix - Selector prefix
 * @param {string} value - Selector value
 * @returns {Element|null}
 */
export function safeQuery(scope, prefix, value) {
  if (typeof scope.querySelector !== 'function') {
    return null;
  }

  const selector = escapeForQuery(prefix, value);

  try {
    return scope.querySelector(selector);
  } catch (error) {
    try {
      return scope.querySelector(prefix + value);
    } catch (_) {
      return null;
    }
  }
}

/**
 * Safely queries all matching elements with fallback.
 * @param {ParentNode} scope - Node to query within
 * @param {string} prefix - Selector prefix
 * @param {string} value - Selector value
 * @returns {Element[]}
 */
export function safeQueryAll(scope, prefix, value) {
  if (typeof scope.querySelectorAll !== 'function') {
    return [];
  }

  const selector = escapeForQuery(prefix, value);

  try {
    return toArray(scope.querySelectorAll(selector));
  } catch (error) {
    try {
      return toArray(scope.querySelectorAll(prefix + value));
    } catch (_) {
      return [];
    }
  }
}

/**
 * Queries elements by class name with multi-class support.
 * @param {ParentNode} scope - Node to query within
 * @param {string} className - Space-separated class names
 * @param {boolean} expectSingle - Return single element or array
 * @returns {Element|Element[]|null}
 */
export function queryClassSelector(scope, className, expectSingle) {
  if (typeof scope.querySelectorAll !== 'function') {
    return expectSingle ? null : [];
  }

  const selector = buildClassSelector(className);
  if (!selector) {
    return expectSingle ? null : [];
  }

  try {
    const matches = scope.querySelectorAll(selector);
    if (expectSingle) {
      return matches.length ? matches[0] : null;
    }

    return toArray(matches);
  } catch (_) {
    return expectSingle ? null : [];
  }
}
