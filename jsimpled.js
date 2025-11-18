(function (global) {
  'use strict';

  const helpers = (function () {
    const hasCssEscape = typeof CSS !== 'undefined' && typeof CSS.escape === 'function';
    const SPECIAL_CHARS_REGEX = /([\0-\x1F\x7F-\x9F\s!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g;
    const slice = Array.prototype.slice;

    function resolveScope(scope) {
      if (!scope) {
        return document;
      }

      const nodeType = scope.nodeType;
      if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
        return scope;
      }

      throw new TypeError('Context must be a DOM node when provided.');
    }

    function escapeForQuery(prefix, value) {
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

    function escapeClassToken(token) {
      if (hasCssEscape) {
        return CSS.escape(token);
      }

      return token.replace(SPECIAL_CHARS_REGEX, '\\$1');
    }

    function buildClassSelector(value) {
      const tokens = value.trim().split(/\s+/).filter(Boolean);
      if (!tokens.length) {
        return '';
      }

      return tokens.map((token) => `.${escapeClassToken(token)}`).join('');
    }

    function toArray(collection) {
      if (!collection || typeof collection.length !== 'number') {
        return [];
      }

      return slice.call(collection);
    }

    function safeQuery(scope, prefix, value) {
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

    function safeQueryAll(scope, prefix, value) {
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

    function queryClassSelector(scope, className, expectSingle) {
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

    return {
      resolveScope,
      escapeForQuery,
      safeQuery,
      safeQueryAll,
      toArray,
      queryClassSelector,
    };
  })();

  function selectOne(selector, context) {
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
   * Returns the first element matching a selector shorthand within the document.
   *
   * @param {string} selector Selector string that may start with '#', '.', or be a tag name.
   * @returns {Element|null} First matching element or null if no match.
   */
  function element(selector) {
    return selectOne(selector);
  }

  function selectAll(selector, context) {
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
   * Returns all elements matching a selector shorthand within the document.
   *
   * @param {string} selector Selector string that may start with '#', '.', or be a tag name.
   * @returns {Element[]} Array of matching elements. Empty when no match.
   */
  function elements(selector) {
    return selectAll(selector);
  }

  function attachScopedSelectors(Prototype) {
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

  attachScopedSelectors(global.Element && global.Element.prototype);
  attachScopedSelectors(global.Document && global.Document.prototype);
  attachScopedSelectors(global.DocumentFragment && global.DocumentFragment.prototype);

  const FETCH_HTML_STATE_ATTR = 'data-jsimpled-fetch-html-state';
  const FETCH_HTML_SELECTOR = 'fetch-html[href], fetch-html[src]';

  function isNode(value) {
    return Boolean(value && typeof value === 'object' && typeof value.nodeType === 'number');
  }

  function setFetchHtmlState(element, state) {
    if (element && typeof element.setAttribute === 'function') {
      element.setAttribute(FETCH_HTML_STATE_ATTR, state);
    }
  }

  function getFetchHtmlState(element) {
    return element && typeof element.getAttribute === 'function'
      ? element.getAttribute(FETCH_HTML_STATE_ATTR)
      : null;
  }

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

  function getFetcher(options) {
    if (options && typeof options.fetch === 'function') {
      return options.fetch;
    }

    if (typeof global.fetch === 'function') {
      return global.fetch.bind(global);
    }

    return null;
  }

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

  function createFragmentFromContent(content) {
    const template = document.createElement('template');
    template.innerHTML = content;
    return template.content.cloneNode(true);
  }

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

  function collectFetchHtmlNodes(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') {
      return [];
    }

    return helpers.toArray(scope.querySelectorAll(FETCH_HTML_SELECTOR));
  }

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

  function fetchHtml(scopeOrOptions, maybeOptions) {
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

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function handleFetchHtmlAutoload() {
      fetchHtml().catch(() => {
        // Errors are already reported via handleError; silence promise warnings.
      });
    });
  }

  if (!global.jsimpled) {
    global.jsimpled = {};
  }

  global.jsimpled.element = element;
  global.jsimpled.elements = elements;
  global.jsimpled.fetchHtml = fetchHtml;
  global.element = element;
  global.elements = elements;
  global.fetchHtml = fetchHtml;
})(typeof window !== 'undefined' ? window : this);
