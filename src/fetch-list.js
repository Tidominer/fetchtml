/**
 * fetch-list and inner-list custom elements for data-driven rendering.
 */

import * as helpers from './helpers.js';
import * as templating from './templating.js';
import * as formatters from './formatters.js';

const STATE_ATTR = 'data-state';
const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
};

function hasReplaceAttribute(element) {
  return Boolean(element && typeof element.hasAttribute === 'function' && element.hasAttribute('replace'));
}

function ensureReplaceAnchor(element, label = 'fetchtml') {
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
      element._fetchtmlReplaceAnchor.nextSibling
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

/**
 * Sets state on an element.
 * @param {Element} element
 * @param {string} state
 */
function setState(element, state) {
  if (element && typeof element.setAttribute === 'function') {
    element.setAttribute(STATE_ATTR, state);
  }
}

/**
 * Gets current state from element.
 * @param {Element} element
 * @returns {string|null}
 */
function getState(element) {
  return element && typeof element.getAttribute === 'function'
    ? element.getAttribute(STATE_ATTR)
    : null;
}

/**
 * Finds a state template (placeholder, empty, error).
 * @param {Element} element - fetch-list element
 * @param {string} attr - Attribute name
 * @returns {Element|null}
 */
function findStateTemplate(element, attr) {
  const templateId = element.getAttribute(attr);
  if (!templateId) return null;
  
  return templating.findTemplate(templateId, element);
}

/**
 * Renders a state template into the element.
 * @param {Element} element - Target element
 * @param {Element} stateTemplate - State template
 */
function renderStateTemplate(element, stateTemplate) {
  if (!stateTemplate) return;
  
  const content = templating.getTemplateContent(stateTemplate);
  if (!content) return;
  
  // Clear and insert state content
  element.innerHTML = '';
  element.appendChild(content);
}

/**
 * Gets fetch implementation from options or global.
 * @param {Object} options
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
 * Builds URL with query parameters.
 * @param {string} baseUrl
 * @param {Object} params
 * @returns {string}
 */
function buildUrl(baseUrl, params) {
  if (!params || !Object.keys(params).length) return baseUrl;
  
  const url = new URL(baseUrl, window.location.origin);
  Object.keys(params).forEach((key) => {
    url.searchParams.set(key, params[key]);
  });
  
  return url.toString();
}

/**
 * Builds RequestInit object from element and options.
 * @param {Element} element
 * @param {Object} options
 * @returns {Object}
 */
function buildRequestInit(element, options) {
  // Check if custom request builder provided
  if (options && typeof options.request === 'function') {
    try {
      return options.request(element) || {};
    } catch (error) {
      console.error('request() hook error:', error);
    }
  }
  
  const init = {};
  
  // Method
  const method = element.getAttribute('method');
  if (method) {
    init.method = method.toUpperCase();
  }
  
  // Credentials (auth attribute)
  const auth = element.getAttribute('auth') || 'omit';
  init.credentials = auth;
  
  // Headers
  if (options && options.headers) {
    if (typeof options.headers === 'function') {
      try {
        init.headers = options.headers(element) || {};
      } catch (error) {
        console.error('headers() hook error:', error);
      }
    } else {
      init.headers = options.headers;
    }
  }
  
  // Body
  if (options && options.body) {
    if (typeof options.body === 'function') {
      try {
        init.body = options.body(element);
      } catch (error) {
        console.error('body() hook error:', error);
      }
    } else {
      init.body = options.body;
    }
    
    // Stringify if object
    if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
      init.body = JSON.stringify(init.body);
      init.headers = init.headers || {};
      if (!init.headers['Content-Type']) {
        init.headers['Content-Type'] = 'application/json';
      }
    }
  }
  
  return init;
}

/**
 * Fetches data for a fetch-list element.
 * @param {Element} element
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function fetchData(element, options) {
  const fetcher = getFetcher(options);
  if (!fetcher) {
    throw new Error('fetch implementation not available.');
  }
  
  let url = element.getAttribute('url');
  if (!url) {
    throw new Error('url attribute is required.');
  }
  
  // Allow url override
  if (options && options.url) {
    url = typeof options.url === 'function' ? options.url(element) : options.url;
  }
  
  // Build query params
  let params = {};
  if (options && options.params) {
    params = typeof options.params === 'function' ? options.params(element) : options.params;
  }
  
  const finalUrl = buildUrl(url, params);
  const requestInit = buildRequestInit(element, options);
  
  const response = await fetcher(finalUrl, requestInit);
  
  if (!response || typeof response.json !== 'function') {
    throw new TypeError('Invalid fetch response.');
  }
  
  if (!response.ok) {
    const error = new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    error.response = response;
    throw error;
  }
  
  const data = await response.json();
  
  // Apply transform
  if (options && typeof options.transform === 'function') {
    try {
      return options.transform(data, element);
    } catch (error) {
      console.error('transform() hook error:', error);
      return data;
    }
  }
  
  return data;
}

/**
 * Renders items into fetch-list element.
 * @param {Element} element
 * @param {Array} items
 * @param {Object} options
 */
function renderItems(element, items, options) {
  const shouldReplace = hasReplaceAttribute(element);
  if (shouldReplace) {
    ensureReplaceAnchor(element, 'fetch-list');
  }

  // Find template
  const templateAttr = element.getAttribute('template');
  if (!templateAttr) {
    console.error('fetch-list requires a "template" attribute that references a document-level template.');
    return;
  }

  const template = templating.findTemplate(templateAttr, element);
  if (!template) {
    console.error('No template found for fetch-list.');
    return;
  }
  
  // beforeRender hook
  if (options && typeof options.beforeRender === 'function') {
    try {
      options.beforeRender(items, element);
    } catch (error) {
      console.error('beforeRender hook error:', error);
    }
  }
  
  // Render
  const { fragment, descriptors } = templating.renderList(items, template, {
    context: options?.context,
    beforeRender: options?.beforeItemRender,
  });
  
  // Annotate rendered nodes with descriptor data for nested context lookups
  attachDescriptors(descriptors);

  let renderedElements = [];

  if (shouldReplace && element.parentNode) {
    const nodesToInsert = Array.from(fragment.childNodes);
    element.replaceWith(fragment);
    element._fetchtmlReplacedNodes = nodesToInsert;

    renderedElements = nodesToInsert.filter((node) => node.nodeType === Node.ELEMENT_NODE);
    renderedElements.forEach((node) => processInnerLists(node));
  } else {
    element.innerHTML = '';
    element.appendChild(fragment);
    element._fetchtmlReplacedNodes = null;

    processInnerLists(element);
    renderedElements = Array.from(element.children);
  }
  
  // afterRender hook
  if (options && typeof options.afterRender === 'function') {
    try {
      options.afterRender(renderedElements, element);
    } catch (error) {
      console.error('afterRender hook error:', error);
    }
  }
}

/**
 * Processes inner-list elements within a container.
 * @param {Element} container
 */
function processInnerLists(container) {
  const innerLists = container.querySelectorAll('inner-list');
  
  innerLists.forEach((innerList) => {
    renderInnerList(innerList);
  });
}

/**
 * Renders an inner-list element.
 * @param {Element} element - inner-list element
 */
function renderInnerList(element) {
  restoreReplaceTarget(element, 'inner-list');

  const key = element.getAttribute('key');
  if (!key) {
    console.warn('inner-list requires a "key" attribute.');
    return;
  }
  
  // Find parent descriptor (stored on closest rendered item)
  const parentDescriptor = findParentDescriptor(element);
  if (!parentDescriptor) {
    console.warn('inner-list could not find parent data context.');
    return;
  }
  
  // Resolve data array
  const items = templating.resolvePath(parentDescriptor.data, key);

  // Handle empty or non-array
  if (!Array.isArray(items) || items.length === 0) {
    const emptyTemplate = findStateTemplate(element, 'empty');
    if (emptyTemplate) {
      renderStateTemplate(element, emptyTemplate);
    } else {
      element.innerHTML = '';
    }
    return;
  }
  
  // Find template
  const templateAttr = element.getAttribute('template');
  if (!templateAttr) {
    console.error('inner-list requires a "template" attribute that references a document-level template.');
    return;
  }

  const template = templating.findTemplate(templateAttr, element);

  if (!template) {
    console.error('No template found for inner-list.');
    return;
  }
  
  // Render items
  const { fragment, descriptors } = templating.renderList(items, template, {
    parentContext: parentDescriptor,
  });
  const shouldReplace = hasReplaceAttribute(element);
  if (shouldReplace) {
    ensureReplaceAnchor(element, 'inner-list');
  }

  attachDescriptors(descriptors);

  if (shouldReplace && element.parentNode) {
    const nodesToInsert = Array.from(fragment.childNodes);
    element.replaceWith(fragment);
    element._fetchtmlReplacedNodes = nodesToInsert;

    nodesToInsert
      .filter((node) => node.nodeType === Node.ELEMENT_NODE)
      .forEach((node) => processInnerLists(node));
  } else {
    element.innerHTML = '';
    element.appendChild(fragment);
    element._fetchtmlReplacedNodes = null;

    // Recursively process nested inner-lists
    processInnerLists(element);
  }

  // Preserve descriptor on element for nested lookups even if replaced
  element._fetchtmlDescriptor = parentDescriptor;
}

/**
 * Finds parent data context for an inner-list.
 * Walks up DOM tree to find data stored on rendered item.
 * @param {Element} element
 * @returns {Object|null}
 */
function findParentDescriptor(element) {
  let current = element.parentElement;
  
  while (current) {
    // Check if this element has descriptor attached
    if (current._fetchtmlDescriptor) {
      return current._fetchtmlDescriptor;
    }
    
    // Stop at fetch-list boundary
    if (current.tagName === 'FETCH-LIST' || current.tagName === 'INNER-LIST') {
      break;
    }
    
    current = current.parentElement;
  }
  
  return null;
}

/**
 * Attaches descriptor metadata to rendered nodes for context traversal.
 * @param {Array} descriptors
 */
function attachDescriptors(descriptors) {
  if (!Array.isArray(descriptors)) {
    return;
  }

  descriptors.forEach((descriptor) => {
    if (!descriptor || !descriptor.nodes) {
      return;
    }

    descriptor.nodes.forEach((node) => {
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        node._fetchtmlData = descriptor.data;
        node._fetchtmlDescriptor = descriptor;
      }
    });
  });
}

/**
 * Main processing function for fetch-list element.
 * @param {Element} element
 * @param {Object} options
 * @returns {Promise}
 */
async function processFetchList(element, options = {}) {
  restoreReplaceTarget(element, 'fetch-list');

  const currentState = getState(element);
  
  // Prevent duplicate loads
  if (currentState === STATES.LOADING) {
    return Promise.resolve();
  }
  
  // Show placeholder
  setState(element, STATES.LOADING);
  const placeholderTemplate = findStateTemplate(element, 'placeholder');
  if (placeholderTemplate) {
    renderStateTemplate(element, placeholderTemplate);
  }
  
  // Notify state change
  if (typeof options.onStateChange === 'function') {
    try {
      options.onStateChange(STATES.LOADING, element);
    } catch (error) {
      console.error('onStateChange hook error:', error);
    }
  }
  
  try {
    const data = await fetchData(element, options);
    
    // Ensure data is array
    const items = Array.isArray(data) ? data : [];
    
    if (items.length === 0) {
      setState(element, STATES.EMPTY);
      const emptyTemplate = findStateTemplate(element, 'empty');
      if (emptyTemplate) {
        renderStateTemplate(element, emptyTemplate);
      } else {
        element.innerHTML = '';
      }
      
      if (typeof options.onStateChange === 'function') {
        options.onStateChange(STATES.EMPTY, element);
      }
      
      return;
    }
    
    // Render items
    renderItems(element, items, options);
    setState(element, STATES.READY);
    
    if (typeof options.onStateChange === 'function') {
      options.onStateChange(STATES.READY, element);
    }
    
  } catch (error) {
    setState(element, STATES.ERROR);
    
    // Show error template
    const errorTemplate = findStateTemplate(element, 'error');
    if (errorTemplate) {
      renderStateTemplate(element, errorTemplate);
    }
    
    // Call error hook
    if (typeof options.onError === 'function') {
      try {
        options.onError(error, element);
      } catch (hookError) {
        console.error('onError hook error:', hookError);
      }
    } else {
      console.error('fetch-list error:', error);
    }
    
    if (typeof options.onStateChange === 'function') {
      options.onStateChange(STATES.ERROR, element);
    }
    
    throw error;
  }
}

/**
 * Creates a controller for a fetch-list element.
 * @param {Element} element
 * @param {Object} options
 * @returns {Object} Controller with reload, setOptions, destroy methods
 */
export function createController(element, options = {}) {
  let currentOptions = { ...options };
  let observer = null;
  
  const controller = {
    /**
     * Reloads the fetch-list with optional overrides.
     * @param {Object} overrides
     * @returns {Promise}
     */
    reload(overrides = {}) {
      const mergedOptions = { ...currentOptions, ...overrides };
      return processFetchList(element, mergedOptions);
    },
    
    /**
     * Updates stored options.
     * @param {Object} newOptions
     */
    setOptions(newOptions) {
      currentOptions = { ...currentOptions, ...newOptions };
    },
    
    /**
     * Destroys the controller and cleans up.
     */
    destroy() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      setState(element, STATES.IDLE);
      element._fetchtmlController = null;
    },
  };
  
  // Store controller on element
  element._fetchtmlController = controller;
  
  // Handle load attribute
  const loadMode = element.getAttribute('load') || 'auto';
  
  if (loadMode === 'auto') {
    // Load immediately
    processFetchList(element, currentOptions).catch(() => {
      // Error already handled
    });
  } else if (loadMode === 'lazy') {
    // Load when visible
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            processFetchList(element, currentOptions).catch(() => {});
            observer.disconnect();
            observer = null;
          }
        });
      });
      
      observer.observe(element);
    } else {
      // Fallback: load after a short delay
      setTimeout(() => {
        processFetchList(element, currentOptions).catch(() => {});
      }, 100);
    }
  }
  // 'manual' mode: do nothing, wait for reload() call
  
  return controller;
}

/**
 * Public API: Initialize or control a fetch-list element.
 * @param {Element|string} elementOrSelector
 * @param {Object} options
 * @returns {Object} Controller
 */
export function fetchList(elementOrSelector, options = {}) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;
  
  if (!element) {
    throw new Error('fetch-list element not found.');
  }
  
  // Return existing controller if present
  if (element._fetchtmlController) {
    // Update options if provided
    if (Object.keys(options).length) {
      element._fetchtmlController.setOptions(options);
    }
    return element._fetchtmlController;
  }
  
  // Create new controller
  return createController(element, options);
}

/**
 * Auto-initializes fetch-list elements on DOMContentLoaded.
 */
export function initFetchListAutoload() {
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      const fetchLists = document.querySelectorAll('fetch-list:not([load]), fetch-list[load="auto"]');
      fetchLists.forEach((element) => {
        if (!element._fetchtmlController) {
          createController(element);
        }
      });
    });
  }
}

// Export formatters for public API
export { formatters };
