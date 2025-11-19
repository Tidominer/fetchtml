# FetchTML

A fetch-first HTML component toolkit for declaratively loading and rendering remote content.

## Features

- **Fetch components**: `<fetch-html>`, `<fetch-list>`, and `<inner-list>` tags that pull HTML and JSON directly into your markup
- **Replace-on-demand**: Add `replace` to remove wrappers when you want fetched fragments to stand alone
- **Templating**: Placeholder syntax with formatter pipelines, parent traversal, and nested contexts
- **Lifecycle hooks**: before/after render, error handlers, and list state templates for loading/empty/error views
- **Selector shorthands (optional)**: Convenience helpers remain available, but FetchTML focuses on fetch-driven markup

## Installation

```bash
npm install fetchtml
```

Or use the single-file build:

```html
<script src="dist/fetchtml.min.js"></script>
```

## Quick Start

Add the following script tag to your HTML head:

```html
<script src="dist/fetchtml.min.js"></script>
```

You can now use the tags:

```html
<!-- Fetch a remote HTML fragment -->
<fetch-html url="/api/users" load="auto"></fetch-html>

<!-- Fetch a single JSON object and render it with a template -->
<fetch-json url="/api/profile" template="#profile" load="auto"></fetch-json>

<!-- Fetch a remote JSON list and render it with a template -->
<fetch-list url="/api/users" template="#user-card" load="auto"></fetch-list>
```

```html
<!-- Define templates once at document level -->
<template id="profile">
  <section class="profile">
    <h1>{name}</h1>
    <p>Email: {email}</p>
  </section>
</template>

<template id="user-card">
  <div class="card">
    <h2>{name}</h2>
    <p>Email: {email}</p>
    <p>Joined: {createdAt|date(YYYY-MM-DD)}</p>
  </div>
</template>
```

### Loading modes

- `load="auto"` (default) – load immediately after DOMContentLoaded
- `load="lazy"` – defer until the element enters the viewport (uses `IntersectionObserver` when available)
- `load="manual"` – skip automatic loading; call `fetchHtml(element)`, `fetchJson(element)`, or `fetchList(element)` when ready
- States are exposed via `data-state` (`idle`, `loading`, `loaded`, `error`) for `<fetch-html>` and `<fetch-json>`, plus `ready`/`empty` for `<fetch-list>`.

## Browser Support

| Browser              | Support |
| -------------------- | ------- |
| Chrome (latest)      | ✅ |
| Firefox (latest)     | ✅ |
| Safari 15+           | ✅ |
| Edge (Chromium)      | ✅ |
| Internet Explorer 11 | ❌ |

> FetchTML relies on modern platform features such as `fetch`, `Custom Elements`, and template cloning. For legacy browsers, include the relevant polyfills before loading the library.

## Development

```bash
# Install dependencies
npm install

# Build for distribution
npm run build

# Run tests (when available)
npm test

# Output directory
# - dist/fetchtml.esm.js
# - dist/fetchtml.js
# - dist/fetchtml.min.js
```

## Documentation

See [api.md](./api.md) for complete API documentation.

## License

MIT
