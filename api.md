# FetchTML API

This document describes the public API for FetchTML, focusing on fetch-aware HTML components, templating utilities, and optional selector helpers.

## HTML Components

### `<fetch-html>`

Fetches HTML content from a URL and injects it inside the `<fetch-html>` element (unless `replace` is present, in which case the wrapper is swapped out).

**Attributes**:
- `href` or `src` *(required)* – URL to fetch content from
- `method` *(optional)* – HTTP method (default: GET)
- `credentials` *(optional)* – Credentials mode: `omit`, `same-origin`, `include`
- `load` *(optional)* – Loading mode: `auto` (default), `lazy`, `manual`
- `replace` *(optional)* – When present, replaces the `<fetch-html>` element with the fetched markup instead of injecting it inside

**States** (`data-state`):
- `idle` – Awaiting a load trigger (default before fetching)
- `loading` – Currently fetching
- `loaded` – Successfully loaded
- `error` – Failed to load

**Example**:
```html
<fetch-html href="header.html"></fetch-html>
<fetch-html src="/api/content" load="lazy"></fetch-html>
```

### `<fetch-json>`

Fetches a JSON object from an endpoint and renders it using template placeholders.

**Attributes**:
- `url` *(required)* – Endpoint that returns a JSON object (aliases: `href`, `src`)
- `template` *(required)* – ID of a `<template>` element defined in the document
- `method` *(optional)* – HTTP method (default: GET)
- `credentials` *(optional)* – Credentials mode: `omit`, `same-origin`, `include`
- `load` *(optional)* – Loading mode: `auto` (default), `lazy`, `manual`
- `placeholder` *(optional)* – Template ID to show while loading
- `error` *(optional)* – Template ID to show on error
- `replace` *(optional)* – When present, replaces the `<fetch-json>` element with the rendered markup

**States** (`data-state`):
- `idle` – Awaiting a load trigger (default before fetching)
- `loading` – Currently fetching
- `loaded` – Successfully rendered
- `error` – Failed to load or missing data

**Example**:
```html
<fetch-json url="/api/profile" template="#profile" load="lazy">
  <template id="profile">
    <section class="profile">
      <h1>{name}</h1>
      <p>{email}</p>
    </section>
  </template>
</fetch-json>
```

### `<fetch-list>`

Fetches a JSON array from an API and renders it using a template with placeholder replacement.

**Attributes**:
- `url` *(required)* – API endpoint that returns a JSON array
- `template` *(required)* – ID of a `<template>` element defined in the document
- `auth` *(optional)* – Credentials mode: `omit` (default), `same-origin`, `include`
- `load` *(optional)* – Loading mode: `auto` (default), `lazy`, `manual`
- `placeholder` *(optional)* – Template ID to show while loading
- `empty` *(optional)* – Template ID to show when array is empty
- `error` *(optional)* – Template ID to show on error
- `method` *(optional)* – HTTP method (default: GET)
- `replace` *(optional)* – When present, renders list items in place of the `<fetch-list>` wrapper while keeping state templates inside the element

**States**:
- `data-state="idle"` – Initial state
- `data-state="loading"` – Currently fetching
- `data-state="ready"` – Successfully rendered
- `data-state="empty"` – Array is empty
- `data-state="error"` – Fetch failed

**Templating**:

Placeholders use `{key}` syntax with support for:
- Nested properties: `{user.name}`, `{orders[0].total}`
- Formatters: `{price|currency(USD)}`, `{createdAt|date(YYYY-MM-DD)}`
- Works in text nodes and attributes: `<button data-id="{id}">View</button>`
- Parent traversal: `{parent.customerId}`, `{parent.parent.accountId}`
- Explicit current/root references: `{data.parent}` or `{root.accountId}` to avoid keyword collisions

The keywords `parent`, `data`, `this`, and `root` are reserved:
- Use `parent` (and `parent.parent`, etc.) to access ancestor list items.
- Use `data` or `this` to refer to the current item explicitly (helpful when the object itself has a `parent` property).
- `root` always points to the item from the top-level `<fetch-list>`.

**Example**:
```html
<fetch-list url="/api/users" template="#user-card" load="auto">
  <template id="user-card">
    <div class="card" data-user-id="{id}">
      <h2>{name}</h2>
      <p>Age: {age}</p>
      <p>Joined: {createdAt|date(YYYY-MM-DD)}</p>
      <p>Balance: {balance|currency(USD)}</p>
    </div>
  </template>
</fetch-list>
```

### `<inner-list>`

Renders a nested array from the parent item's data. Must be used inside a `<fetch-list>` template.

- `key` *(required)* – Property name containing the nested array (supports dot/bracket notation)
- `template` *(required)* – ID of a `<template>` element defined in the document
- `empty` *(optional)* – Template ID to show when nested array is empty
- `replace` *(optional)* – When present, renders nested items in place of the `<inner-list>` tag

**Example**:
```html
<fetch-list url="/api/users" template="#user-template">
  <template id="user-template">
    <div class="user">
      <h2>{name}</h2>
      <h3>Orders:</h3>
      <inner-list key="orders" template="#order-template" empty="#no-orders">
        <template id="order-template">
          <div class="order">
            <p>Order #{id}: {total|currency(USD)}</p>
            <span class="status">{status|upper}</span>
            <button class="order-details" data-customer="{parent.id}" data-order="{id}">
              View details for {parent.name}
            </button>
          </div>
        </template>
        <template id="no-orders">
          <p>No orders yet</p>
        </template>
      </inner-list>
    </div>
  </template>
</fetch-list>
```

## JavaScript API

### `fetchHtml(scopeOrOptions, maybeOptions)`

Processes `<fetch-html>` elements within a scope.

**Parameters**:
- `scopeOrOptions` `{Element|Object}` – DOM scope or options object
- `maybeOptions` `{Object}` – Options when first param is scope

**Options**:
- `fetch` `{Function}` – Custom fetch implementation
- `transform` `{Function}` – Transform HTML before insertion: `(html, element) => string`
- `beforeInsert` `{Function}` – Hook before DOM insertion: `(element, fragment) => Node?`
- `afterInsert` `{Function}` – Hook after insertion: `(element) => void`
- `onError` `{Function}` – Error handler: `(error, element) => void`
- `request` `{Function}` – Custom RequestInit builder: `(element) => RequestInit`

**Returns**: `{Promise<Element[]>}` – Processed elements

**Example**:
```js
// Process all fetch-html elements
fetchHtml();

// Process fetch-html within a scope
fetchHtml(document.querySelector('#content'));

// With options
fetchHtml({
  transform: (html, element) => html.replace(/foo/g, 'bar'),
  onError: (error) => console.error('fetchHtml failed:', error)
});
```

### `fetchList(elementOrSelector, options)`

Controls a `<fetch-list>` element programmatically.

**Parameters**:
- `elementOrSelector` `{Element|string}` – fetch-list element or CSS selector
- `options` `{Object}` – Configuration options

**Options**:
- `url` `{string|Function}` – Override URL: `(element) => string`
- `params` `{Object|Function}` – Query parameters: `(element) => Object`
- `body` `{*|Function}` – Request body: `(element) => any`
- `headers` `{Object|Function}` – Custom headers: `(element) => Object`
- `request` `{Function}` – Full RequestInit builder: `(element) => RequestInit`
- `transform` `{Function}` – Transform data: `(data, element) => Array`
- `beforeRender` `{Function}` – Before rendering: `(items, element) => void`
- `afterRender` `{Function}` – After rendering: `(nodes, element) => void`
- `beforeItemRender` `{Function}` – Before each item: `(fragment, item, context) => void`
- `onError` `{Function}` – Error handler: `(error, element) => void`
- `onStateChange` `{Function}` – State change listener: `(state, element) => void`
- `fetch` `{Function}` – Custom fetch implementation

**Returns**: `{Object}` – Controller with methods:
- `reload(overrides)` – Refetch with optional option overrides
- `setOptions(options)` – Update stored options
- `destroy()` – Clean up and reset

**Example**:
```js
// Get controller for element
const controller = fetchList('#user-list');

// Reload with different parameters
controller.reload({
  params: { status: 'active', page: 2 }
});

// With custom headers for auth
const authList = fetchList('#products', {
  headers: (element) => ({
    'Authorization': `Bearer ${getToken()}`
  })
});

// Manual reload
document.querySelector('#reload-btn').addEventListener('click', () => {
  controller.reload();
});
```

### `fetchJson(elementOrSelector, options)`

Controls a `<fetch-json>` element programmatically.

**Parameters**:
- `elementOrSelector` `{Element|string}` – fetch-json element or CSS selector
- `options` `{Object}` – Configuration options

**Options**:
- `url` `{string|Function}` – Override URL: `(element) => string`
- `headers` `{Object|Function}` – Custom headers: `(element) => Object`
- `body` `{*|Function}` – Request body
- `request` `{Function}` – Full RequestInit builder: `(element) => RequestInit`
- `transform` `{Function}` – Transform data before rendering: `(data, element) => any`
- `beforeRender` `{Function}` – Hook before DOM insertion: `(node, data, element) => void`
- `afterRender` `{Function}` – Hook after insertion: `(nodes, data, element) => void`
- `onError` `{Function}` – Error handler: `(error, element) => void`
- `onStateChange` `{Function}` – State change listener: `(state, element) => void`
- `fetch` `{Function}` – Custom fetch implementation

**Returns**: `{Promise<Element[]>}` – Processed elements

**Example**:
```js
// Process all fetch-json elements
fetchJson();

// Process a single element with custom headers
fetchJson('#profile', {
  headers: () => ({ 'Authorization': `Bearer ${getToken()}` })
});

// Manual load of lazily configured element
const profileEl = document.querySelector('fetch-json[load="manual"]');
fetchJson(profileEl);
```

### `formatters.register(name, fn)`

Registers a custom formatter function.

**Parameters**:
- `name` `{string}` – Formatter name (used in templates)
- `fn` `{Function}` – Formatter function: `(value, args, context) => any`

**Example**:
```js
// Register custom formatter
fetchtml.formatters.register('reverse', (value) => {
  return String(value).split('').reverse().join('');
});

// Use in template
// {username|reverse}
```

### `formatters.unregister(name)`

Removes a registered formatter.

**Parameters**:
- `name` `{string}` – Formatter name

**Returns**: `{boolean}` – True if formatter existed

### Built-in Formatters

- `upper` – Convert to uppercase
- `lower` – Convert to lowercase
- `capitalize` – Capitalize first letter
- `number(decimals)` – Format number with decimal places
- `currency(code, locale)` – Format as currency (e.g., `USD`, `EUR`)
- `date(format)` – Format date (tokens: YYYY, MM, DD, HH, mm, ss)
- `join(separator)` – Join array with separator
- `truncate(length, suffix)` – Truncate string with ellipsis
- `default(fallback)` – Return fallback if value is falsy
- `map(key=value,...)` – Map values (e.g., `pending=Pending,active=Active`)
- `urlencode` – URL-encode value
- `escape` – HTML-escape value

**Examples**:
```html
{price|currency(USD)}
{createdAt|date(YYYY-MM-DD HH:mm)}
{tags|join(, )}
{description|truncate(100)}
{status|map(0=Inactive,1=Active)}
{username|default(Anonymous)}
```

## Helper Methods (optional)

These selector helpers are convenience APIs attached to `fetchtml` and DOM prototypes. They’re not required for fetch-driven rendering, but remain available when you want concise DOM queries.

### `element(selector)`

Returns the first element in the current document that matches the selector shorthand (`#id`, `.class`, or tag name).

- **Parameters**:
  - `selector` `{string}` – Selector string that may start with `#`, `.`, or a tag name. Leading and trailing whitespace is ignored.
- **Returns**: `{Element|null}` – The first matching element, or `null` when no match is found.
- Space-separated class names (e.g. `.card featured`) require the element to contain **all** listed classes.

```js
const hero = element('#hero');
const firstCard = element('.card');
const firstSection = element('section');
const missingButton = element('#does-not-exist'); // => null
```

> **Note:** Every `Element` also receives `element(selector)` for scoped lookups within its descendants. Usage and error handling are the same as the global helper.

**Errors**

- Throws `TypeError` when `selector` is not a string.

### `elements(selector)`

Returns an array of all elements in the current document that match the selector shorthand.

- **Parameters**:
  - `selector` `{string}` – Selector string that may start with `#`, `.`, or a tag name.
- **Returns**: `{Element[]}` – Array of matching elements. Empty when no element matches.
- Space-separated class names filter to elements containing every class in the list.

```js
const allCards = elements('.card');
const sections = elements('section');
const nonexistent = elements('#missing'); // => []
```

> **Note:** `Element#elements(selector)` provides the same API scoped to descendants of that element.

**Errors**

- Throws `TypeError` when `selector` is not a string.
