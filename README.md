# jsimpled

A lightweight DOM helper library with shorthand selectors, HTML includes, and declarative data binding.

## Features

- **Shorthand selectors**: `element('#id')`, `element('.class')`, `element('tag')`
- **Multi-class support**: Space-separated classes require all matches
- **Scoped queries**: `someElement.element('.child')`
- **HTML includes**: `<include href="partial.html">`
- **Data-driven lists**: `<fetch-list>` with JSON API binding and templating
- **Nested rendering**: `<inner-list>` for hierarchical data
- **Template formatters**: Built-in and custom value transformers
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

### Browser (global usage)

```html
<script src="dist/jsimpled.min.js"></script>
<script>
  // Select elements without imports
  const hero = element('#hero');
  const cards = elements('.card');
  const firstLink = hero.element('a');

  // Load includes
  include();
  
  // Control fetch-list dynamically
  const userList = fetchList('#users');
  userList.reload({ params: { status: 'active' } });
</script>
```

### Module bundlers (optional)

```js
import { element, elements, include, fetchList } from 'jsimpled';

const hero = element('#hero');
const cards = elements('.card');
include();
```

### Data-driven rendering

```html
<fetch-list url="/api/users" template="#user-card" load="auto">
  <template id="user-card">
    <div class="card">
      <h2>{name}</h2>
      <p>Email: {email}</p>
      <p>Joined: {createdAt|date(YYYY-MM-DD)}</p>
    </div>
  </template>
</fetch-list>
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
