/**
 * Element selection functions using shorthand syntax.
 */

import * as helpers from './helpers.js';

/**
 * Selects a single element using shorthand notation.
 * @param {string} selector - Selector string (#id, .class, or tag)
 * @param {ParentNode} [context] - Optional scope to search within
 * @returns {Element|null}
 */
export function selectOne(selector, context) {
  if (typeof selector !== 'string') {
    throw new TypeError('Selector must be a string.');
  }

  const trimmed = selector.trim();
  if (!trimmed) {
    return null;
  }

  const scope = helpers.resolveScope(context);
  const firstChar = trimmed.charAt(0);

  if (firstChar === '#') {
    const id = trimmed.slice(1);
    if (!id) {
      return null;
    }

    if (scope.nodeType === 9 && typeof scope.getElementById === 'function') {
      return scope.getElementById(id);
    }

    return helpers.safeQuery(scope, '#', id);
  }

  if (firstChar === '.') {
    const className = trimmed.slice(1);
    if (!className) {
      return null;
    }

    if (typeof scope.getElementsByClassName === 'function') {
      const matches = scope.getElementsByClassName(className);
      return matches.length ? matches[0] : null;
    }

    return helpers.queryClassSelector(scope, className, true);
  }

  const tagName = trimmed.toLowerCase();
  if (typeof scope.getElementsByTagName === 'function') {
    const matches = scope.getElementsByTagName(tagName);
    return matches.length ? matches[0] : null;
  }

  return helpers.safeQuery(scope, '', tagName);
}

/**
 * Selects all matching elements using shorthand notation.
 * @param {string} selector - Selector string (#id, .class, or tag)
 * @param {ParentNode} [context] - Optional scope to search within
 * @returns {Element[]}
 */
export function selectAll(selector, context) {
  if (typeof selector !== 'string') {
    throw new TypeError('Selector must be a string.');
  }

  const trimmed = selector.trim();
  if (!trimmed) {
    return [];
  }

  const scope = helpers.resolveScope(context);
  const firstChar = trimmed.charAt(0);

  if (firstChar === '#') {
    const id = trimmed.slice(1);
    if (!id) {
      return [];
    }

    const found = scope.nodeType === 9 && typeof scope.getElementById === 'function'
      ? scope.getElementById(id)
      : helpers.safeQuery(scope, '#', id);

    return found ? [found] : [];
  }

  if (firstChar === '.') {
    const className = trimmed.slice(1);
    if (!className) {
      return [];
    }

    if (typeof scope.getElementsByClassName === 'function') {
      return helpers.toArray(scope.getElementsByClassName(className));
    }

    return helpers.queryClassSelector(scope, className, false);
  }

  const tagName = trimmed.toLowerCase();
  if (typeof scope.getElementsByTagName === 'function') {
    return helpers.toArray(scope.getElementsByTagName(tagName));
  }

  return helpers.safeQueryAll(scope, '', tagName);
}

/**
 * Returns the first element matching a selector shorthand within the document.
 *
 * @param {string} selector Selector string that may start with '#', '.', or be a tag name.
 * @returns {Element|null} First matching element or null if no match.
 */
export function element(selector) {
  return selectOne(selector);
}

/**
 * Returns all elements matching a selector shorthand within the document.
 *
 * @param {string} selector Selector string that may start with '#', '.', or be a tag name.
 * @returns {Element[]} Array of matching elements. Empty when no match.
 */
export function elements(selector) {
  return selectAll(selector);
}

/**
 * Attaches scoped selector methods to DOM prototypes.
 * @param {Object} Prototype - DOM prototype to extend
 */
export function attachScopedSelectors(Prototype) {
  if (!Prototype) {
    return;
  }

  if (!Prototype.hasOwnProperty('element')) {
    Object.defineProperty(Prototype, 'element', {
      /**
       * Returns the first descendant of this node matching the provided selector shorthand.
       *
       * @this {ParentNode}
       * @param {string} selector Selector string to match.
       * @returns {Element|null} First matching descendant element or null if none.
       */
      value: function scopedElement(selector) {
        return selectOne(selector, this);
      },
      writable: true,
      configurable: true,
    });
  }

  if (!Prototype.hasOwnProperty('elements')) {
    Object.defineProperty(Prototype, 'elements', {
      /**
       * Returns all descendants of this node matching the provided selector shorthand.
       *
       * @this {ParentNode}
       * @param {string} selector Selector string to match.
       * @returns {Element[]} Matching descendant elements.
       */
      value: function scopedElements(selector) {
        return selectAll(selector, this);
      },
      writable: true,
      configurable: true,
    });
  }
}
