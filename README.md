# 99ML Converter & Simulator

Convert modern webpages to **99ML** markup for the TI-99/4A running [Stuart's Internet Web Browser](http://www.stuartconner.me.uk/ti/ti.htm#internet_web_browser).

## Quick Start

```bash
# Install dependencies
npm install

# Run both simulator and converter
npm run dev
```

- **Simulator**: http://localhost:5173
- **Converter API**: http://localhost:3000

## Components

### 1. 99ML Simulator (`/simulator`)
A browser-based preview of how 99ML will render on the TI-99/4A:
- 40×24 character grid display
- TI-99/4A 16-color palette
- CRT-style visual effects
- Interactive link highlighting

### 2. DOM-to-99ML Converter (`/converter`)
Node.js server that converts webpages to 99ML:

```bash
# Convert a URL
curl "http://localhost:3000/convert?url=https://example.com"

# Convert HTML
curl -X POST -d '<html><body>Hello!</body></html>' http://localhost:3000/convert
```

## 99ML Tag Reference

See [docs/99ML-SPEC.md](docs/99ML-SPEC.md) for the complete tag specification.

### Key Tags
| Tag | Description |
|-----|-------------|
| `<99ml>` | Root document tag |
| `<pos:YY:XX>` | Position cursor (hex row:col) |
| `<clr:F:B>` | Set foreground:background colors |
| `<a href="..." pos="YYXX">` | Hyperlink |
| `<br>` | Line break |

### Screen Constraints
- **40 columns × 24 rows**
- All positions in **uppercase hex** (00-17 rows, 00-27 cols)
- 16 colors (0-F)

## Development

```bash
# Simulator only
npm run dev:simulator

# Converter only
npm run dev:converter
```

## License

MIT
