# 99ML Tag Specification Reference

> **Source**: [Stuart Conner's TI-99/4a Internet Web Browser](http://www.stuartconner.me.uk/ti/ti.htm#internet_web_browser)

## Hardware & Display Constraints

| Property | Value |
|----------|-------|
| Screen Width | 40 characters |
| Screen Height | 24 rows |
| Row Range (hex) | `00` to `17` (0-23 decimal) |
| Column Range (hex) | `00` to `27` (0-39 decimal) |
| Colors | 16-color palette (0-F) |
| Character Width | 6 pixels in 8-pixel block |

> [!IMPORTANT]
> All coordinates and lengths must be in **UPPERCASE hexadecimal** (A-F, not a-f).

---

## Color Codes (Hex 0-F)

| Code | Color | Code | Color |
|------|-------|------|-------|
| `0` | Transparent | `8` | Medium Red |
| `1` | Black | `9` | Light Red |
| `2` | Medium Green | `A` | Dark Yellow |
| `3` | Light Green | `B` | Light Yellow |
| `4` | Dark Blue | `C` | Dark Green |
| `5` | Light Blue | `D` | Magenta |
| `6` | Dark Red | `E` | Grey |
| `7` | Cyan | `F` | White |

---

## Structural & Text Tags

### `<99ml>` - Root Document Tag
```xml
<99ml>
  ...page content...
</99ml>
```

### `<p>` - Paragraph/Text Block
```xml
<p>Text content here</p>
```

### `<br>` - Line Break
```xml
<br>
```

### `<pos:YY:XX>` - Cursor Position
Moves cursor to row `YY`, column `XX` (both hex).
```xml
<pos:0A:05>  <!-- Row 10, Column 5 -->
```

### `<clr:F:B>` - Set Colors
Sets foreground `F` and background `B` colors.
```xml
<clr:1:F>  <!-- Black text on White background -->
```

### `<chr:XX>` - Character by Hex Code
Displays character with hex ASCII code `XX`.
```xml
<chr:41>  <!-- Displays 'A' -->
```

---

## Hyperlinks & Navigation

### `<a>` - Anchor/Link
```xml
<a href="page2.99ml" pos="0A05">Click Here</a>
```

| Attribute | Description |
|-----------|-------------|
| `href` | Target URL or filename |
| `pos` | Start position as `YYXX` (hex row + column) |

---

## Graphics & Character Definitions

### `<cdef:XX:PATTERN>` - Custom Character Definition
Defines a custom 8x8 pattern for character code `XX`.
```xml
<cdef:80:0018244242241800>  <!-- 16-hex-digit pattern -->
```

### `<img>` - Image Display
```xml
<img src="image.99i" pos="0A05" 8pclr>
```

| Attribute | Description |
|-----------|-------------|
| `src` | Image filename |
| `pos` | Position as `YYXX` |
| `8pclr` | Optional color mode flag |

### `<8pclr:XX:PATTERN>` - 8-Pixel Color Pattern
Sets color pattern for 8-pixel character blocks.
```xml
<8pclr:80:1F1F1F1F1F1F1F1F>
```

---

## User Input & Forms

### `<input>` - Text Input Field
```xml
<input name="username" pos="0505" len="10" clr="1:F" ptrclr="4">
```

| Attribute | Description |
|-----------|-------------|
| `name` | Field name for form submission |
| `pos` | Position as `YYXX` |
| `len` | Field length (hex) |
| `clr` | Foreground:Background colors |
| `ptrclr` | Cursor/pointer color |

### `<input-dv>` - Input with Default Value
```xml
<input-dv name="search" pos="0505" len="14" val="default text" clr="1:F">
```

### `<pwd>` - Password Input
Same as `<input>` but masks characters.
```xml
<pwd name="password" pos="0605" len="10" clr="1:F">
```

### `<submit>` - Submit Button
```xml
<submit name="go" pos="0805" len="08" clr="1:4" ptr="SEARCH" ptrclr="F">
```

| Attribute | Description |
|-----------|-------------|
| `ptr` | Button text label |

---

## Sound & Audio Tags

### `<sound>` - Play Sound File
```xml
<sound src="beep.snd" dur="10">
```

### `<note:XX:YY>` - Play Note
Plays frequency `XX` for duration `YY` (both hex).
```xml
<note:3F:08>
```

### Other Sound Tags
- `<s-env>` - Sound envelope
- `<n-env>` - Noise envelope  
- `<n-freq>` - Noise frequency
- `<s-per>` - Sound period

---

## Key Constraints Summary

1. **Hex Coordinates**: All positions use `YYXX` format in uppercase hex
2. **40x24 Grid**: Screen is exactly 40 columns × 24 rows
3. **No Auto-Flow**: Unlike HTML, text doesn't automatically wrap—use `<pos>` for layout
4. **Case Sensitivity**: Hex values A-F must be UPPERCASE
5. **Limited Styling**: No CSS—use `<clr>` for color, `<pos>` for positioning
