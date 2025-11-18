/**
 * HTML include functionality for dynamic content loading.
 */

import * as helpers from './helpers.js';

const INCLUDE_STATE_ATTR = 'data-jsimpled-include-state';
const INCLUDE_SELECTOR = 'include[href], include[src]';

/**
 * Checks if value is a DOM node.
 * @param {*} value - Value to check
 * @returns {boolean}
 */
function isNode(value) {
  return Boolean(value && typeof value === 'object' && typeof value.nodeType === 'number');
}

/**
 * Marks include element with loading state.
 * @param {Element} element - Include element
 * @param {string} state - State to set
 */
function markIncludeState(element, state) {
  if (element && typeof element.setAttribute === 'function') {
    element.setAttribute(INCLUDE_STATE_ATTR, state);
  }
}

/**
 * Gets include element's current state.
 * @param {Element} element - Include element
 * @returns {string|null}
 */
function getIncludeState(element) {
  return element && typeof element.getAttribute === 'function'
    ? element.getAttribute(INCLUDE_STATE_ATTR)
    : null;
}

/**
 * Normalizes include function arguments.
 * @param {*} scopeOrOptions - Scope or options object
 * @param {Object} [maybeOptions] - Options object
 * @returns {{scope: *, options: Object|null}}
 */
function normalizeIncludeArgs(scopeOrOptions, maybeOptions) {
  if (isNode(scopeOrOptions)) {
    return {
      scope: scopeOrOptions,
      options: maybeOptions || null,
    };
  }

  return {
    scope: undefined,
    options: scopeOrOptions || null,
  };
}

/**
 * Gets fetch implementation from options or global.
 * @param {Object} [options] - Options object
 * @returns {Function|null}
 */
function getIncludeFetcher(options) {
  if (options && typeof options.fetch === 'function') {
    return options.fetch;
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch.bind(window);
  }

  return null;
}

/**
 * Builds RequestInit from element attributes and options.
 * @param {Element} element - Include element
 * @param {Object} [options] - Options object
 * @returns {Object|undefined}
 */
function buildRequestInit(element, options) {
  if (options && typeof options.request === 'function') {
    return options.request(element) || undefined;
  }

  const init = {};
  const method = element.getAttribute('method');
  if (method) {
    init.method = method;
  }

  const credentials = element.getAttribute('credentials');
  if (credentials) {
    init.credentials = credentials;
  }

  return Object.keys(init).length ? init : undefined;
}

/**
 * Creates DocumentFragment from HTML string.
 * @param {string} content - HTML content
 * @returns {DocumentFragment}
 */
function createFragmentFromContent(content) {
  const template = document.createElement('template');
  template.innerHTML = content;
  return template.content.cloneNode(true);
}

/**
 * Invokes a hook function safely.
 * @param {Function} hook - Hook function
 * @param {Array} args - Arguments
 * @returns {*}
 */
function invokeHook(hook, args) {
  if (typeof hook === 'function') {
    try {
      return hook.apply(null, args);
    } catch (error) {
      console.error(error);
    }
  }

  return undefined;
}

/**
 * Handles successful include processing.
 * @param {Element} element - Include element
 * @param {DocumentFragment} fragment - Content fragment
 * @param {Object} [options] - Options object
 */
function handleIncludeSuccess(element, fragment, options) {
  const override = invokeHook(options && options.beforeInsert, [element, fragment]);
  const nodeToInsert = typeof Node !== 'undefined' && override instanceof Node ? override : fragment;

  if (typeof element.replaceWith === 'function') {
    element.replaceWith(nodeToInsert);
  } else if (element.parentNode) {
    element.parentNode.replaceChild(nodeToInsert, element);
  }

  markIncludeState(element, 'loaded');
  invokeHook(options && options.afterInsert, [element]);
}

/**
 * Handles include processing error.
 * @param {Element} element - Include element
 * @param {Object} [options] - Options object
 * @param {Error} error - Error that occurred
 */
function handleIncludeError(element, options, error) {
  markIncludeState(element, 'error');
  if (element && typeof options?.onError === 'function') {
    try {
      options.onError(error, element);
      return;
    } catch (hookError) {
      console.error(hookError);
    }
  }

  console.error(error);
}

/**
 * Processes a single include element.
 * @param {Element} element - Include element
 * @param {Object} [options] - Options object
 * @returns {Promise<Element|null>}
 */
function processIncludeElement(element, options) {
  const existingState = getIncludeState(element);
  if (existingState === 'loading' || existingState === 'loaded') {
    return Promise.resolve(null);
  }

  const source = element.getAttribute('href') || element.getAttribute('src');
  if (!source) {
    const error = new Error('include element requires an "href" or "src" attribute.');
    handleIncludeError(element, options, error);
    return Promise.reject(error);
  }

  const fetchImpl = getIncludeFetcher(options);
  if (!fetchImpl) {
    const error = new Error('jsimpled.include requires a fetch implementation.');
    handleIncludeError(element, options, error);
    return Promise.reject(error);
  }

  markIncludeState(element, 'loading');
  const requestInit = buildRequestInit(element, options);

  return fetchImpl(source, requestInit)
    .then((response) => {
      if (!response || typeof response.text !== 'function') {
        throw new TypeError('Invalid response from include fetch.');
      }

      if (!response.ok) {
        const error = new Error(`Failed to load include (${response.status} ${response.statusText}).`);
        error.response = response;
        throw error;
      }

      return response.text();
    })
    .then((rawContent) => {
      const transform = options && options.transform;
      const content = typeof transform === 'function'
        ? transform(rawContent, element)
        : rawContent;

      const fragment = createFragmentFromContent(String(content || ''));
      handleIncludeSuccess(element, fragment, options || null);
      return element;
    })
    .catch((error) => {
      handleIncludeError(element, options, error);
      throw error;
    });
}

/**
 * Collects include elements from scope.
 * @param {ParentNode} scope - Scope to search
 * @returns {Element[]}
 */
function collectIncludeNodes(scope) {
  if (!scope || typeof scope.querySelectorAll !== 'function') {
    return [];
  }

  return helpers.toArray(scope.querySelectorAll(INCLUDE_SELECTOR));
}

/**
 * Reports scope resolution error.
 * @param {Object} [options] - Options object
 * @param {Error} error - Error that occurred
 * @param {*} scope - Scope that failed
 */
function reportIncludeScopeError(options, error, scope) {
  if (typeof options?.onError === 'function') {
    try {
      options.onError(error, scope || null);
      return;
    } catch (hookError) {
      console.error(hookError);
    }
  }

  console.error(error);
}

/**
 * Processes all include elements in scope.
 * @param {ParentNode|Object} [scopeOrOptions] - Scope or options
 * @param {Object} [maybeOptions] - Options object
 * @returns {Promise<Element[]>}
 */
export function include(scopeOrOptions, maybeOptions) {
  if (typeof document === 'undefined') {
    return Promise.resolve([]);
  }

  const normalized = normalizeIncludeArgs(scopeOrOptions, maybeOptions);
  const options = normalized.options || {};

  let scope;
  try {
    scope = normalized.scope ? helpers.resolveScope(normalized.scope) : document;
  } catch (error) {
    reportIncludeScopeError(options, error, normalized.scope || null);
    return Promise.reject(error);
  }

  const nodes = collectIncludeNodes(scope);
  if (!nodes.length) {
    return Promise.resolve([]);
  }

  const promises = nodes.map((node) => processIncludeElement(node, options));
  return Promise.all(promises).catch((error) => {
    throw error;
  });
}

/**
 * Auto-initializes include processing on DOMContentLoaded.
 */
export function initIncludeAutoload() {
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function handleIncludeAutoload() {
      include().catch(() => {
        // Errors are already reported via handleIncludeError; silence promise warnings.
      });
    });
  }
}
