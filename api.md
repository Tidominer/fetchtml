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
