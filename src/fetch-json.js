import * as helpers from './helpers.js';
import * as templating from './templating.js';

const STATE_ATTR = 'data-state';
const FETCH_JSON_SELECTOR = 'fetch-json[url], fetch-json[src], fetch-json[href]';
const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

function hasReplaceAttribute(element) {
  return Boolean(element && typeof element.hasAttribute === 'function' && element.hasAttribute('replace'));
}

function ensureReplaceAnchor(element, label = 'fetch-json') {
  if (!hasReplaceAttribute(element)) {
    return null;
  }

  if (!element._fetchtmlReplaceAnchor) {
    element._fetchtmlReplaceAnchor = document.createComment(`${label} replace anchor`);
    if (element.parentNode) {
      element.parentNode.insertBefore(element._fetchtmlReplaceAnchor, element);
    }
  } else if (
    element._fetchtmlReplaceAnchor.parentNode &&
    element.parentNode !== element._fetchtmlReplaceAnchor.parentNode
  ) {
    element._fetchtmlReplaceAnchor.parentNode.insertBefore(
      element,
      element._fetchtmlReplaceAnchor.nextSibling,
    );
  }

  return element._fetchtmlReplaceAnchor;
}

function cleanupReplacedNodes(element) {
  if (Array.isArray(element?._fetchtmlReplacedNodes)) {
    element._fetchtmlReplacedNodes.forEach((node) => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  element._fetchtmlReplacedNodes = null;
}

function restoreReplaceTarget(element, label) {
  if (!hasReplaceAttribute(element)) {
    return;
  }

  const anchor = ensureReplaceAnchor(element, label);
  if (!anchor) {
    return;
  }

  cleanupReplacedNodes(element);

  if (!element.parentNode && anchor.parentNode) {
    anchor.parentNode.insertBefore(element, anchor.nextSibling);
  }
}

function setState(element, state) {
  if (element && typeof element.setAttribute === 'function') {
    element.setAttribute(STATE_ATTR, state);
  }
}

function getState(element) {
  return element && typeof element.getAttribute === 'function'
    ? element.getAttribute(STATE_ATTR)
    : null;
}

function findStateTemplate(element, attr) {
  const templateId = element.getAttribute(attr);
  if (!templateId) {
    return null;
  }

  return templating.findTemplate(templateId, element);
}

function renderStateTemplate(element, stateTemplate) {
  if (!stateTemplate) {
    return;
  }

  const content = templating.getTemplateContent(stateTemplate);
  if (!content) {
    return;
  }

  element.innerHTML = '';
  element.appendChild(content);
}

function getFetcher(options) {
  if (options && typeof options.fetch === 'function') {
    return options.fetch;
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch.bind(window);
  }

  return null;
}

function buildRequestInit(element, options) {
  if (options && typeof options.request === 'function') {
    try {
      return options.request(element) || undefined;
    } catch (error) {
      console.error('fetch-json request() hook error:', error);
    }
  }

  const init = {};
  const method = element.getAttribute('method');
  if (method) {
    init.method = method.toUpperCase();
  }

  const credentials = element.getAttribute('credentials');
  if (credentials) {
    init.credentials = credentials;
  }

  if (options && options.headers) {
    if (typeof options.headers === 'function') {
      try {
        init.headers = options.headers(element) || {};
      } catch (error) {
        console.error('fetch-json headers() hook error:', error);
      }
    } else {
      init.headers = options.headers;
    }
  }

  if (options && options.body) {
    if (typeof options.body === 'function') {
      try {
        init.body = options.body(element);
      } catch (error) {
        console.error('fetch-json body() hook error:', error);
      }
    } else {
      init.body = options.body;
    }

    if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
      init.body = JSON.stringify(init.body);
      init.headers = init.headers || {};
      if (!init.headers['Content-Type']) {
        init.headers['Content-Type'] = 'application/json';
      }
    }
  }

  return Object.keys(init).length ? init : undefined;
}

async function fetchJsonData(element, options) {
  const fetcher = getFetcher(options);
  if (!fetcher) {
    throw new Error('fetch implementation not available.');
  }

  let url = element.getAttribute('url') || element.getAttribute('href') || element.getAttribute('src');
  if (!url) {
    throw new Error('fetch-json element requires a "url" attribute.');
  }

  if (options && options.url) {
    url = typeof options.url === 'function' ? options.url(element) : options.url;
  }

  const requestInit = buildRequestInit(element, options);
  const response = await fetcher(url, requestInit);

  if (!response || typeof response.json !== 'function') {
    throw new TypeError('Invalid fetch response.');
  }

  if (!response.ok) {
    const error = new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    error.response = response;
    throw error;
  }

  const data = await response.json();

  if (options && typeof options.transform === 'function') {
    try {
      return options.transform(data, element);
    } catch (error) {
      console.error('fetch-json transform() hook error:', error);
    }
  }

  return data;
}

function renderData(element, data, options) {
  const shouldReplace = hasReplaceAttribute(element);
  if (shouldReplace) {
    ensureReplaceAnchor(element, 'fetch-json');
  }

  const templateAttr = element.getAttribute('template');
  let template = null;

  if (templateAttr) {
    template = templating.findTemplate(templateAttr, element);
  } else {
    template = element.querySelector('template');
  }

  if (!template) {
    console.error('No template found for fetch-json.');
    element.innerHTML = '';
    element.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data ?? '');
    return [];
  }

  const templateContent = templating.getTemplateContent(template);
  if (!templateContent) {
    console.error('Template content is empty for fetch-json.');
    return [];
  }

  const context = {
    root: data,
    data,
    ancestors: [],
    depth: 0,
  };

  const rendered = templating.processTemplate(templateContent, data, context);

  if (typeof options?.beforeRender === 'function') {
    try {
      options.beforeRender(rendered, data, element);
    } catch (error) {
      console.error('fetch-json beforeRender hook error:', error);
    }
  }

  let renderedNodes = [];

  if (shouldReplace && element.parentNode) {
    cleanupReplacedNodes(element);

    if (rendered instanceof DocumentFragment) {
      const nodesToInsert = Array.from(rendered.childNodes);
      element.replaceWith(rendered);
      element._fetchtmlReplacedNodes = nodesToInsert;
      renderedNodes = nodesToInsert.filter((node) => node.nodeType === Node.ELEMENT_NODE);
    } else {
      element.replaceWith(rendered);
      element._fetchtmlReplacedNodes = rendered ? [rendered] : [];
      renderedNodes = rendered && rendered.nodeType === Node.ELEMENT_NODE ? [rendered] : [];
    }
  } else {
    element.innerHTML = '';
    if (rendered instanceof DocumentFragment) {
      element.appendChild(rendered);
      renderedNodes = Array.from(element.children);
    } else if (rendered) {
      element.appendChild(rendered);
      renderedNodes = rendered.nodeType === Node.ELEMENT_NODE ? [rendered] : [];
    }

    element._fetchtmlReplacedNodes = null;
  }

  if (typeof options?.afterRender === 'function') {
    try {
      options.afterRender(renderedNodes, data, element);
    } catch (error) {
      console.error('fetch-json afterRender hook error:', error);
    }
  }

  return renderedNodes;
}

function handleError(element, options, error) {
  setState(element, STATES.ERROR);

  const errorTemplate = findStateTemplate(element, 'error');
  if (errorTemplate) {
    renderStateTemplate(element, errorTemplate);
  }

  if (typeof options?.onError === 'function') {
    try {
      options.onError(error, element);
      return;
    } catch (hookError) {
      console.error('fetch-json onError hook error:', hookError);
    }
  }

  console.error(error);
}

function getLoadMode(element) {
  if (!element || typeof element.getAttribute !== 'function') {
    return 'auto';
  }

  const raw = element.getAttribute('load');
  if (!raw) {
    return 'auto';
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'lazy' || normalized === 'manual') {
    return normalized;
  }

  return 'auto';
}

function scheduleLazyLoad(element, options) {
  if (!element || element._fetchtmlLazyScheduled) {
    return Promise.resolve(null);
  }

  element._fetchtmlLazyScheduled = true;

  const clearScheduling = () => {
    element._fetchtmlLazyScheduled = false;

    if (element._fetchtmlLazyObserver) {
      element._fetchtmlLazyObserver.disconnect();
      element._fetchtmlLazyObserver = null;
    }

    if (element._fetchtmlLazyTimeout) {
      if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
        window.clearTimeout(element._fetchtmlLazyTimeout);
      }
      element._fetchtmlLazyTimeout = null;
    }
  };

  const triggerLoad = () => {
    clearScheduling();
    processFetchJsonElement(element, options || null).catch(() => {
      // Errors are handled inside processFetchJsonElement.
    });
  };

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          triggerLoad();
        }
      });
    });

    observer.observe(element);
    element._fetchtmlLazyObserver = observer;
  } else if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
    element._fetchtmlLazyTimeout = window.setTimeout(triggerLoad, 100);
  } else {
    triggerLoad();
  }

  return Promise.resolve(null);
}

async function processFetchJsonElement(element, options = {}) {
  restoreReplaceTarget(element, 'fetch-json');

  const currentState = getState(element);
  if (currentState === STATES.LOADING) {
    return Promise.resolve(null);
  }

  setState(element, STATES.LOADING);

  const placeholderTemplate = findStateTemplate(element, 'placeholder');
  if (placeholderTemplate) {
    renderStateTemplate(element, placeholderTemplate);
  }

  if (typeof options.onStateChange === 'function') {
    try {
      options.onStateChange(STATES.LOADING, element);
    } catch (error) {
      console.error('fetch-json onStateChange hook error:', error);
    }
  }

  try {
    const data = await fetchJsonData(element, options);
    if (data == null) {
      setState(element, STATES.ERROR);
      console.error('fetch-json received empty data.');
      return element;
    }

    const renderedNodes = renderData(element, data, options);
    setState(element, STATES.READY);

    if (typeof options.onStateChange === 'function') {
      options.onStateChange(STATES.READY, element, renderedNodes);
    }

    return element;
  } catch (error) {
    handleError(element, options, error);

    if (typeof options.onStateChange === 'function') {
      try {
        options.onStateChange(STATES.ERROR, element);
      } catch (hookError) {
        console.error('fetch-json onStateChange hook error:', hookError);
      }
    }

    throw error;
  }
}

function collectFetchJsonNodes(scope) {
  if (!scope || typeof scope.querySelectorAll !== 'function') {
    return [];
  }

  return helpers.toArray(scope.querySelectorAll(FETCH_JSON_SELECTOR));
}

function normalizeFetchJsonArgs(scopeOrOptions, maybeOptions) {
  if (scopeOrOptions && typeof scopeOrOptions === 'object' && typeof scopeOrOptions.nodeType === 'number') {
    return {
      scope: scopeOrOptions,
      options: maybeOptions || null,
      manualTrigger: true,
    };
  }

  if (scopeOrOptions && typeof scopeOrOptions === 'object') {
    return {
      scope: undefined,
      options: scopeOrOptions,
      manualTrigger: true,
    };
  }

  return {
    scope: undefined,
    options: maybeOptions || null,
    manualTrigger: false,
  };
}

function reportScopeError(options, error, scope) {
  if (typeof options?.onError === 'function') {
    try {
      options.onError(error, scope || null);
      return;
    } catch (hookError) {
      console.error('fetch-json onError hook error:', hookError);
    }
  }

  console.error(error);
}

export function fetchJson(scopeOrOptions, maybeOptions) {
  if (typeof document === 'undefined') {
    return Promise.resolve([]);
  }

  const normalized = normalizeFetchJsonArgs(scopeOrOptions, maybeOptions);
  const options = normalized.options || {};
  const manualTrigger = Boolean(normalized.manualTrigger);

  let scope;
  try {
    scope = normalized.scope ? helpers.resolveScope(normalized.scope) : document;
  } catch (error) {
    reportScopeError(options, error, normalized.scope || null);
    return Promise.reject(error);
  }

  const nodes = collectFetchJsonNodes(scope);
  if (!nodes.length) {
    return Promise.resolve([]);
  }

  const promises = [];

  nodes.forEach((node) => {
    if (!getState(node)) {
      setState(node, STATES.IDLE);
    }

    const loadMode = getLoadMode(node);

    if (loadMode === 'manual' && !manualTrigger) {
      return;
    }

    if (loadMode === 'lazy' && !manualTrigger) {
      setState(node, STATES.IDLE);
      promises.push(scheduleLazyLoad(node, options));
      return;
    }

    promises.push(processFetchJsonElement(node, options));
  });

  if (!promises.length) {
    return Promise.resolve([]);
  }

  return Promise.all(promises).catch((error) => {
    throw error;
  });
}

export function initFetchJsonAutoload() {
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      fetchJson().catch(() => {
        // Errors are already handled in processFetchJsonElement.
      });
    });
  }
}
