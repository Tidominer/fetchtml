/**
 * jsimpled - Lightweight DOM helper library
 * Main entry point that exports all public APIs
 */

import { element, elements, attachScopedSelectors } from './selectors.js';
import { fetchHtml, initFetchHtmlAutoload } from './fetch-html.js';
import { fetchList, initFetchListAutoload, formatters } from './fetch-list.js';

// Attach scoped selector methods to DOM prototypes
if (typeof window !== 'undefined') {
  attachScopedSelectors(window.Element && window.Element.prototype);
  attachScopedSelectors(window.Document && window.Document.prototype);
  attachScopedSelectors(window.DocumentFragment && window.DocumentFragment.prototype);

  // Auto-initialize fetch-html on DOMContentLoaded
  initFetchHtmlAutoload();
  
  // Auto-initialize fetch-list on DOMContentLoaded
  initFetchListAutoload();

  // Export to global namespace
  if (!window.jsimpled) {
    window.jsimpled = {};
  }

  window.jsimpled.fetchHtml = fetchHtml;
  window.jsimpled.elements = elements;
  window.jsimpled.fetchHtml = fetchHtml;
  window.jsimpled.fetchList = fetchList;
  window.jsimpled.formatters = formatters;
  window.element = element;
  window.elements = elements;
  window.fetchHtml = fetchHtml;
  window.fetchList = fetchList;
}

// Export for module systems
export { element, elements, fetchHtml, fetchList, formatters };
