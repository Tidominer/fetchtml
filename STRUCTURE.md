# Project Structure

## Overview

The jsimpled library has been split into modular ES6 files for easier development and maintenance. The build process combines these modules into a single distributable file.

## Directory Layout

```
jsimpled/
├── src/                    # Source modules
│   ├── helpers.js         # Shared DOM utility functions
│   ├── selectors.js       # Element selection logic
│   ├── fetch-html.js      # HTML fetching functionality
│   └── index.js           # Main entry point & exports
├── dist/                   # Build output (generated)
│   ├── jsimpled.js        # IIFE bundle
│   ├── jsimpled.esm.js    # ESM bundle
│   └── jsimpled.min.js    # Minified IIFE bundle
├── api.md                  # API documentation
├── README.md               # Project overview
├── package.json            # NPM configuration
├── build.js                # Build script
└── .gitignore              # Git ignore rules
```

## Module Breakdown

### `src/helpers.js`
Core utility functions used across modules:
- `resolveScope()` - Validates and normalizes DOM scopes
- `escapeForQuery()` - Safely escapes selector strings
- `buildClassSelector()` - Handles multi-class queries
- `toArray()` - Converts collections to arrays
- `safeQuery()` / `safeQueryAll()` - Safe querySelector wrappers
- `queryClassSelector()` - Multi-class query helper

### `src/selectors.js`
Element selection with shorthand syntax:
- `selectOne()` / `selectAll()` - Internal selection logic
- `element()` / `elements()` - Public API
- `attachScopedSelectors()` - Prototype extension

### `src/fetch-html.js`
HTML fetch tag processing:
- State management functions
- Fetch and processing logic
- Hook system (beforeInsert, afterInsert, onError, etc.)
- `fetchHtml()` - Public API
- `initFetchHtmlAutoload()` - DOMContentLoaded handler

### `src/index.js`
Main entry point that:
- Imports all modules
- Attaches methods to DOM prototypes
- Exports public APIs
- Sets up global namespace

## Build Process

The build uses esbuild to:
1. Bundle ES6 modules into single files
2. Generate multiple formats (ESM, IIFE)
3. Minify for production
4. Create source maps

### Build Commands

```bash
# Install dependencies
npm install

# Build all formats
npm run build

# Output:
# - dist/jsimpled.esm.js    (ES module)
# - dist/jsimpled.js        (IIFE for <script> tags)
# - dist/jsimpled.min.js    (Minified IIFE)
```

## Development Workflow

1. **Edit source files** in `src/` directory
2. **Build** with `npm run build`
3. **Test** the output in `dist/`
4. **Commit** changes to git

## Adding New Features

To add a new feature:

1. Create a new module in `src/` or add to existing module
2. Export necessary functions
3. Import and re-export from `src/index.js`
4. Update `api.md` documentation
5. Rebuild with `npm run build`

## Benefits of Modular Structure

- **Maintainability**: Each module has a single responsibility
- **Testability**: Modules can be tested independently
- **Extensibility**: New features can be added as new modules
- **Collaboration**: Multiple developers can work on different modules
- **Single-file distribution**: Build process creates one file for users
