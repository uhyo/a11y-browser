# a11y-browser

A Chromium-based console browser that uses accessibility trees.

## About This Project

### Goals

- Provide a way to explore modern web applications on the command line.
- Be a toy for developers who want to explore the accessibility tree.
- Comply with the [WAI-ARIA](https://www.w3.org/TR/wai-aria/) standard.

### Non-Goals

- Be an assistive technology.

## How to build

Currently this isn't published so you need to build it yourself.

```sh
npm run build
```

## Usage

Start interactive browsing by:

```sh
node dist/index.js http://example.com
```

### Command Line Options

#### `--snapshot`

Output the contents of page and exit.

```sh
node dist/index.js http://example.com --snapshot
```

#### `--debug`

Output debug logs to stderr.

```sh
node dist/index.js http://example.com --debug 2>error.txt
```

## Contributing

Welcome

## License

MIT
