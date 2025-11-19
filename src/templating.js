/**
 * Template parsing and placeholder replacement engine.
 */

import * as formatters from './formatters.js';

function normalizeToken(token) {
  if (typeof token !== 'string') {
    return token;
  }

  const startsWithQuote = token.startsWith('"') || token.startsWith("'");
  const endsWithQuote = token.endsWith('"') || token.endsWith("'");

  if (startsWithQuote && endsWithQuote && token.length >= 2) {
    return token.slice(1, -1);
  }

  return token;
}

/**
 * Resolves a nested property path in an object.
 * Supports: user.name, orders[0].total, items[0]
 * @param {Object} obj - Source object
 * @param {string} path - Property path
 * @returns {*} Resolved value or undefined
 */
export function resolvePath(obj, path) {
  if (!obj || typeof path !== 'string') return undefined;

  const rawParts = path.match(/[^.[\]]+/g);
  const parts = rawParts ? rawParts.map(normalizeToken) : null;
  if (!parts) return undefined;

  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Parses a placeholder into its components.
 * Formats: {key}, {key|formatter}, {key|formatter(arg1, arg2)}
 * @param {string} placeholder - Placeholder string with braces
 * @returns {{key: string, formatter: string|null, args: Array}} Parsed components
 */
export function parsePlaceholder(placeholder) {
  // Remove braces
  const content = placeholder.slice(1, -1).trim();

  // Check for formatter
  const pipeIndex = content.indexOf('|');
  if (pipeIndex === -1) {
    return { key: content, formatter: null, args: [] };
  }

  const key = content.slice(0, pipeIndex).trim();
  const formatterPart = content.slice(pipeIndex + 1).trim();

  // Check for formatter arguments
  const parenIndex = formatterPart.indexOf('(');
  if (parenIndex === -1) {
    return { key, formatter: formatterPart, args: [] };
  }

  const formatterName = formatterPart.slice(0, parenIndex).trim();
  const argsString = formatterPart.slice(parenIndex + 1, formatterPart.lastIndexOf(')')).trim();

  // Parse arguments (simple comma-separated, no nested parsing for now)
  const args = argsString
    ? argsString.split(',').map(arg => arg.trim())
    : [];

  return { key, formatter: formatterName, args };
}

/**
 * Replaces placeholders in a string with values from data object.
 * @param {string} template - Template string with {key} placeholders
 * @param {Object} data - Data object
 * @param {Object} context - Additional context (index, parent, etc.)
 * @returns {string} String with placeholders replaced
 */
function resolveValue(data, key, context = {}) {
  if (!key) {
    return undefined;
  }

  const rawTokens = key.match(/[^.[\]]+/g);
  const tokens = rawTokens ? rawTokens.map(normalizeToken) : null;
  if (!tokens || !tokens.length) {
    return undefined;
  }

  let current;
  let index = 0;
  const ancestors = context.ancestors || [];

  if (tokens[0] === 'parent') {
    if (!ancestors.length) {
      return undefined;
    }

    let depth = 0;
    while (tokens[index] === 'parent') {
      if (depth >= ancestors.length) {
        return undefined;
      }

      current = ancestors[depth];
      depth += 1;
      index += 1;

      if (index >= tokens.length) {
        return current;
      }
    }
  } else if (tokens[0] === 'root') {
    current = context.root != null ? context.root : data;
    index += 1;
    if (index >= tokens.length) {
      return current;
    }
  } else if (tokens[0] === 'data' || tokens[0] === 'this') {
    current = data;
    index += 1;
    if (index >= tokens.length) {
      return current;
    }
  } else {
    current = data;
  }

  for (; index < tokens.length; index += 1) {
    const part = tokens[index];
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

export function replacePlaceholders(template, data, context = {}) {
  if (typeof template !== 'string') return template;

  const placeholderRegex = /\{[^}]+\}/g;

  return template.replace(placeholderRegex, (match) => {
    const { key, formatter, args } = parsePlaceholder(match);

    // Resolve value from data
    let value = resolveValue(data, key, context);

    // Apply formatter if specified
    if (formatter && formatters.has(formatter)) {
      value = formatters.apply(formatter, value, args, { ...context, data });
    }

    // Convert to string, handle null/undefined
    return value != null ? String(value) : '';
  });
}

/**
 * Processes a template element by replacing all placeholders.
 * Works on text nodes and attribute values.
 * @param {DocumentFragment|Element} template - Template to process
 * @param {Object} data - Data object
 * @param {Object} context - Additional context
 * @returns {DocumentFragment|Element} Processed template
 */
export function processTemplate(template, data, context = {}) {
  if (!template) return template;

  // Clone to avoid mutating original
  const clone = template.cloneNode(true);

  // Process text nodes
  const walker = document.createTreeWalker(
    clone,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const original = textNode.nodeValue;
    if (original && original.includes('{')) {
      textNode.nodeValue = replacePlaceholders(original, data, context);
    }
  });

  // Process attributes
  const elements = clone.querySelectorAll ? clone.querySelectorAll('*') : [];
  Array.from(elements).forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.value && attr.value.includes('{')) {
        attr.value = replacePlaceholders(attr.value, data, context);
      }
    });
  });

  // Handle clone being DocumentFragment vs Element
  if (clone instanceof DocumentFragment && clone.children.length === 0) {
    // Only text nodes, wrap in span
    const wrapper = document.createElement('span');
    wrapper.appendChild(clone.cloneNode(true));
    return wrapper;
  }

  return clone;
}

/**
 * Finds a template element by ID or selector.
 * Searches within scope first, then document.
 * @param {string} selector - Template selector or ID
 * @param {Element} scope - Scope to search within first
 * @returns {HTMLTemplateElement|null}
 */
export function findTemplate(selector, scope = null) {
  if (!selector) return null;

  // Add # if it looks like an ID without prefix
  const query = selector.startsWith('#') ? selector : `#${selector}`;

  // Search in document
  return document.querySelector(query);
}

/**
 * Gets template content as a DocumentFragment.
 * @param {HTMLTemplateElement|Element} template - Template element
 * @returns {DocumentFragment|null}
 */
export function getTemplateContent(template) {
  if (!template) return null;

  // Handle <template> elements
  if (template.content) {
    return template.content.cloneNode(true);
  }

  // Handle regular elements - clone children
  const fragment = document.createDocumentFragment();
  Array.from(template.children).forEach((child) => {
    fragment.appendChild(child.cloneNode(true));
  });

  return fragment;
}

/**
 * Renders an array of items using a template.
 * @param {Array} items - Array of data items
 * @param {HTMLTemplateElement|Element} template - Template element
 * @param {Object} options - Rendering options
 * @returns {Object} Fragment with rendered items and descriptors
 */
export function renderList(items, template, options = {}) {
  const fragment = document.createDocumentFragment();
  const descriptors = [];

  if (!Array.isArray(items) || !items.length) {
    return { fragment, descriptors };
  }

  const templateContent = getTemplateContent(template);
  if (!templateContent) {
    console.warn('Template content is empty.');
    return { fragment, descriptors };
  }

  const parentContext = options.parentContext || null;
  const extraContext = options.context || {};

  items.forEach((item, index) => {
    const ancestors = parentContext
      ? [parentContext.data, ...(parentContext.ancestors || [])]
      : [];
    const descriptor = {
      data: item,
      parent: parentContext ? parentContext.data : null,
      root: parentContext ? parentContext.root : (extraContext.root ?? item),
      ancestors,
      nodes: [],
    };

    const context = {
      index,
      first: index === 0,
      last: index === items.length - 1,
      parent: descriptor.parent,
      root: descriptor.root,
      ancestors,
      depth: ancestors.length,
      data: item,
      ...extraContext,
    };

    const rendered = processTemplate(templateContent, item, context);

    // Capture nodes before appending (DocumentFragment loses children on append)
    if (rendered instanceof DocumentFragment) {
      descriptor.nodes = Array.from(rendered.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE);
    } else if (rendered) {
      descriptor.nodes = rendered.nodeType === Node.ELEMENT_NODE ? [rendered] : [];
    }

    // Call beforeRender hook
    if (typeof options.beforeRender === 'function') {
      try {
        options.beforeRender(rendered, item, context);
      } catch (error) {
        console.error('beforeRender hook error:', error);
      }
    }

    fragment.appendChild(rendered);
    descriptors.push(descriptor);
  });

  return { fragment, descriptors };
}
