# jsimpled Library API

This document lists the public methods currently shipped with `jsimpled`. Each section captures the method description, parameters, return type, example usage, and error conditions. Additional helpers will appear here as the library grows.

## Selection helpers

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

**Errors**

- Throws `TypeError` when `selector` is not a string.

### `Element#element(selector)`

Searches within the descendants of the current node using the same selector shorthand.
- **Parameters**:
  - `selector` `{string}` – Selector string that may start with `#`, `.`, or a tag name.
- **Returns**: `{Element|null}` – First matching descendant element, or `null`.

```js
const sidebar = element('#sidebar');
const firstLinkInSidebar = sidebar.element('a');

// Works with chaining
const submitButton = element('form').element('.submit');
```

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

**Errors**

- Throws `TypeError` when `selector` is not a string.

### `Element#elements(selector)`

Returns an array of descendant elements on the current node that match the selector shorthand.

- **Parameters**:
  - `selector` `{string}` – Selector string that may start with `#`, `.`, or a tag name.
- **Returns**: `{Element[]}` – Matching descendant elements. Empty when there is no match.
- Space-separated class names filter within the current scope to descendants carrying all classes.

```js
const list = element('ul');
const items = list.elements('li');

// Chain with other selectors
const formButtons = element('form').elements('button');
```

**Errors**

- Throws `TypeError` when `selector` is not a string.

## HTML Components

### `<fetch-html>`

Fetches HTML content from a URL and replaces the `<fetch-html>` tag with the fetched markup.

**Attributes**:
- `href` or `src` *(required)* – URL to fetch content from
- `method` *(optional)* – HTTP method (default: GET)
- `credentials` *(optional)* – Credentials mode: `omit`, `same-origin`, `include`

**States**:
- `data-jsimpled-fetch-html-state="loading"` – Currently fetching
- `data-jsimpled-fetch-html-state="loaded"` – Successfully loaded
- `data-jsimpled-fetch-html-state="error"` – Failed to load

**Example**:
```html
<fetch-html href="header.html"></fetch-html>
<fetch-html src="/api/content" method="POST"></fetch-html>
```

### `<fetch-list>`

Fetches a JSON array from an API and renders it using a template with placeholder replacement.

**Attributes**:
- `url` *(required)* – API endpoint that returns a JSON array
- `template` *(optional)* – Template ID (searches inside element first, then document)
- `auth` *(optional)* – Credentials mode: `omit` (default), `same-origin`, `include`
- `load` *(optional)* – Loading mode: `auto` (default), `lazy`, `manual`
- `placeholder` *(optional)* – Template ID to show while loading
- `empty` *(optional)* – Template ID to show when array is empty
- `error` *(optional)* – Template ID to show on error
- `method` *(optional)* – HTTP method (default: GET)

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

**Attributes**:
- `key` *(required)* – Property name containing the nested array (supports dot/bracket notation)
- `template` *(optional)* – Template ID for rendering items
- `empty` *(optional)* – Template ID to show when nested array is empty

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

### `formatters.register(name, fn)`

Registers a custom formatter function.

**Parameters**:
- `name` `{string}` – Formatter name (used in templates)
- `fn` `{Function}` – Formatter function: `(value, args, context) => any`

**Example**:
```js
// Register custom formatter
jsimpled.formatters.register('reverse', (value) => {
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
