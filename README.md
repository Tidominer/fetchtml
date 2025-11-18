# jsimpled

A lightweight DOM helper library with shorthand selector syntax and HTML include functionality.

## Features

- **Shorthand selectors**: `element('#id')`, `element('.class')`, `element('tag')`
- **Multi-class support**: Space-separated classes require all matches
- **Scoped queries**: `someElement.element('.child')`
- **HTML includes**: `<include href="partial.html">`
- **Zero dependencies**
- **Tiny footprint**

## Installation

```bash
npm install jsimpled
```

Or use the single-file build:

```html
<script src="dist/jsimpled.min.js"></script>
```

## Quick Start

```html
<script type="module">
  import { element, elements, include } from 'jsimpled';

  // Select elements
  const hero = element('#hero');
  const cards = elements('.card');
  const firstLink = hero.element('a');

  // Load includes
  include();
</script>
```

## Development

```bash
# Install dependencies
npm install

# Build for distribution
npm run build

# Run tests (when available)
npm test
```

## Documentation

See [api.md](./api.md) for complete API documentation.

## License

MIT
