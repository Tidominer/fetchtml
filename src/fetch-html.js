/**
 * fetch-html functionality for dynamic content loading.
 */

import * as helpers from './helpers.js';

const FETCH_HTML_STATE_ATTR = 'data-jsimpled-fetch-html-state';
const FETCH_HTML_SELECTOR = 'fetch-html[href], fetch-html[src]';

/**
 * Checks if value is a DOM node.
 * @param {*} value - Value to check
 * @returns {boolean}
 */
function isNode(value) {
  return Boolean(value && typeof value === 'object' && typeof value.nodeType === 'number');
}

/**
 * Marks fetch-html element with loading state.
 * @param {Element} element - fetch-html element
 * @param {string} state - State to set
 */
function setFetchHtmlState(element, state) {
  if (element && typeof element.setAttribute === 'function') {
    element.setAttribute(FETCH_HTML_STATE_ATTR, state);
  }
}

/**
 * Gets fetch-html element's current state.
 * @param {Element} element - fetch-html element
 * @returns {string|null}
 */
function getFetchHtmlState(element) {
  return element && typeof element.getAttribute === 'function'
    ? element.getAttribute(FETCH_HTML_STATE_ATTR)
    : null;
}

/**
 * Normalizes fetchHtml function arguments.
 * @param {*} scopeOrOptions - Scope or options object
 * @param {Object} [maybeOptions] - Options object
 * @returns {{scope: *, options: Object|null}}
 */
function normalizeFetchHtmlArgs(scopeOrOptions, maybeOptions) {
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
function getFetcher(options) {
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
 * @param {Element} element - fetch-html element
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
 * Handles successful fetch-html processing.
 * @param {Element} element - fetch-html element
 * @param {DocumentFragment} fragment - Content fragment
 * @param {Object} [options] - Options object
 */
function handleSuccess(element, fragment, options) {
  const override = invokeHook(options && options.beforeInsert, [element, fragment]);
  const nodeToInsert = typeof Node !== 'undefined' && override instanceof Node ? override : fragment;

  if (typeof element.replaceWith === 'function') {
    element.replaceWith(nodeToInsert);
  } else if (element.parentNode) {
    element.parentNode.replaceChild(nodeToInsert, element);
  }

  setFetchHtmlState(element, 'loaded');
  invokeHook(options && options.afterInsert, [element]);
}

/**
 * Handles fetch-html processing error.
 * @param {Element} element - fetch-html element
 * @param {Object} [options] - Options object
 * @param {Error} error - Error that occurred
 */
function handleError(element, options, error) {
  setFetchHtmlState(element, 'error');
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
 * Processes a single fetch-html element.
 * @param {Element} element - fetch-html element
 * @param {Object} [options] - Options object
 * @returns {Promise<Element|null>}
 */
function processFetchHtmlElement(element, options) {
  const existingState = getFetchHtmlState(element);
  if (existingState === 'loading' || existingState === 'loaded') {
    return Promise.resolve(null);
  }

  const source = element.getAttribute('href') || element.getAttribute('src');
  if (!source) {
    const error = new Error('fetch-html element requires an "href" or "src" attribute.');
    handleError(element, options, error);
    return Promise.reject(error);
  }

  const fetchImpl = getFetcher(options);
  if (!fetchImpl) {
    const error = new Error('jsimpled.fetchHtml requires a fetch implementation.');
    handleError(element, options, error);
    return Promise.reject(error);
  }

  setFetchHtmlState(element, 'loading');
  const requestInit = buildRequestInit(element, options);

  return fetchImpl(source, requestInit)
    .then((response) => {
      if (!response || typeof response.text !== 'function') {
        throw new TypeError('Invalid response from fetch-html request.');
      }

      if (!response.ok) {
        const error = new Error(`Failed to load fetch-html (${response.status} ${response.statusText}).`);
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
      handleSuccess(element, fragment, options || null);
      return element;
    })
    .catch((error) => {
      handleError(element, options, error);
      throw error;
    });
}

/**
 * Collects fetch-html elements from scope.
 * @param {ParentNode} scope - Scope to search
 * @returns {Element[]}
 */
function collectFetchHtmlNodes(scope) {
  if (!scope || typeof scope.querySelectorAll !== 'function') {
    return [];
  }

  return helpers.toArray(scope.querySelectorAll(FETCH_HTML_SELECTOR));
}

/**
 * Reports scope resolution error.
 * @param {Object} [options] - Options object
 * @param {Error} error - Error that occurred
 * @param {*} scope - Scope that failed
 */
function reportScopeError(options, error, scope) {
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
 * Processes all fetch-html elements in scope.
 * @param {ParentNode|Object} [scopeOrOptions] - Scope or options
 * @param {Object} [maybeOptions] - Options object
 * @returns {Promise<Element[]>}
 */
export function fetchHtml(scopeOrOptions, maybeOptions) {
  if (typeof document === 'undefined') {
    return Promise.resolve([]);
  }

  const normalized = normalizeFetchHtmlArgs(scopeOrOptions, maybeOptions);
  const options = normalized.options || {};

  let scope;
  try {
    scope = normalized.scope ? helpers.resolveScope(normalized.scope) : document;
  } catch (error) {
    reportScopeError(options, error, normalized.scope || null);
    return Promise.reject(error);
  }

  const nodes = collectFetchHtmlNodes(scope);
  if (!nodes.length) {
    return Promise.resolve([]);
  }

  const promises = nodes.map((node) => processFetchHtmlElement(node, options));
  return Promise.all(promises).catch((error) => {
    throw error;
  });
}

/**
 * Auto-initializes fetch-html processing on DOMContentLoaded.
 */
export function initFetchHtmlAutoload() {
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function handleFetchHtmlAutoload() {
      fetchHtml().catch(() => {
        // Errors are already reported via handleError; silence promise warnings.
      });
    });
  }
}
