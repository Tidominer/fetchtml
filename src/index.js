/**
 * FetchTML - Fetch-first HTML component toolkit
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
  if (!window.fetchtml) {
    window.fetchtml = {};
  }

  window.fetchtml.fetchHtml = fetchHtml;
  window.fetchtml.fetchList = fetchList;
  window.fetchtml.formatters = formatters;
  window.fetchtml.element = element;
  window.fetchtml.elements = elements;

  // Backward compatibility aliases (optional future removal)
  window.fetchHtml = fetchHtml;
  window.fetchList = fetchList;
}

// Export for module systems
export { element, elements, fetchHtml, fetchList, formatters };
