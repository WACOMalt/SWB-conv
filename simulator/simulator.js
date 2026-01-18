/**
 * 99ML Simulator - TI-99/4A Stuart's Web Browser
 * Renders 99ML markup as it would appear on the TI-99/4A
 */

// TI-99/4A Color Palette (indexed 0-F)
const TI_COLORS = {
  '0': 'transparent',
  '1': '#000000',  // Black
  '2': '#21C842',  // Medium Green
  '3': '#5EDC78',  // Light Green
  '4': '#5455ED',  // Dark Blue
  '5': '#7D76FC',  // Light Blue
  '6': '#D4524D',  // Dark Red
  '7': '#42EBF5',  // Cyan
  '8': '#FC5554',  // Medium Red
  '9': '#FF7978',  // Light Red
  'A': '#D4C154',  // Dark Yellow
  'B': '#E6CE80',  // Light Yellow
  'C': '#21B03B',  // Dark Green
  'D': '#C95BBA',  // Magenta
  'E': '#CCCCCC',  // Grey
  'F': '#FFFFFF',  // White
};

// Screen dimensions
const COLS = 40;
const ROWS = 24;

// Screen state
let screenBuffer = [];
let colorBuffer = [];  // [{fg, bg}, ...]
let links = [];        // [{startRow, startCol, endRow, endCol, href, text}, ...]
let currentFg = 'F';   // Default white
let currentBg = '4';   // Default dark blue
let cursorRow = 0;
let cursorCol = 0;

/**
 * Initialize empty screen buffer
 */
function initScreen() {
  screenBuffer = [];
  colorBuffer = [];
  links = [];
  currentFg = 'F';
  currentBg = '4';
  cursorRow = 0;
  cursorCol = 0;

  for (let r = 0; r < ROWS; r++) {
    screenBuffer[r] = [];
    colorBuffer[r] = [];
    for (let c = 0; c < COLS; c++) {
      screenBuffer[r][c] = ' ';
      colorBuffer[r][c] = { fg: 'F', bg: '4' };
    }
  }
}

/**
 * Convert hex string to decimal
 */
function hexToDec(hex) {
  return parseInt(hex, 16);
}

/**
 * Parse 99ML and populate screen buffer
 */
function parse99ML(source) {
  initScreen();

  // Remove 99ml wrapper tags
  let content = source.replace(/<\/?99ml>/gi, '');

  // Tokenize - split into tags and text
  const tokenRegex = /<([^>]+)>|([^<]+)/g;
  let match;
  let inLink = false;
  let linkStart = { row: 0, col: 0 };
  let linkHref = '';
  let linkText = '';

  while ((match = tokenRegex.exec(content)) !== null) {
    if (match[1]) {
      // It's a tag
      const tagContent = match[1].trim();
      processTag(tagContent);

      // Check for link start
      if (tagContent.toLowerCase().startsWith('a ') || tagContent.toLowerCase() === 'a') {
        inLink = true;
        linkStart = { row: cursorRow, col: cursorCol };
        // Extract href
        const hrefMatch = tagContent.match(/href\s*=\s*["']?([^"'\s>]+)/i);
        linkHref = hrefMatch ? hrefMatch[1] : '';
        // Extract pos if present
        const posMatch = tagContent.match(/pos\s*=\s*["']?([0-9A-Fa-f]{4})/i);
        if (posMatch) {
          const pos = posMatch[1].toUpperCase();
          cursorRow = hexToDec(pos.substring(0, 2));
          cursorCol = hexToDec(pos.substring(2, 4));
          linkStart = { row: cursorRow, col: cursorCol };
        }
        linkText = '';
      }

      // Check for link end
      if (tagContent.toLowerCase() === '/a') {
        if (inLink) {
          links.push({
            startRow: linkStart.row,
            startCol: linkStart.col,
            endRow: cursorRow,
            endCol: cursorCol,
            href: linkHref,
            text: linkText
          });
          inLink = false;
        }
      }

    } else if (match[2]) {
      // It's text content
      const text = match[2];
      for (const char of text) {
        if (char === '\n' || char === '\r') {
          // Ignore raw newlines (use <br> instead)
          continue;
        }
        writeChar(char);
        if (inLink) {
          linkText += char;
        }
      }
    }
  }

  renderScreen();
  updateStatus();
}

/**
 * Process a single tag
 */
function processTag(tagContent) {
  const lowerTag = tagContent.toLowerCase();

  // <br> - Line break
  if (lowerTag === 'br' || lowerTag === 'br/') {
    cursorRow++;
    cursorCol = 0;
    if (cursorRow >= ROWS) cursorRow = ROWS - 1;
    return;
  }

  // <pos:YY:XX> - Position cursor
  const posMatch = tagContent.match(/^pos:([0-9A-Fa-f]{2}):([0-9A-Fa-f]{2})$/i);
  if (posMatch) {
    cursorRow = hexToDec(posMatch[1]);
    cursorCol = hexToDec(posMatch[2]);
    // Clamp to screen bounds
    cursorRow = Math.min(cursorRow, ROWS - 1);
    cursorCol = Math.min(cursorCol, COLS - 1);
    return;
  }

  // <clr:F:B> - Set colors
  const clrMatch = tagContent.match(/^clr:([0-9A-Fa-f]):([0-9A-Fa-f])$/i);
  if (clrMatch) {
    currentFg = clrMatch[1].toUpperCase();
    currentBg = clrMatch[2].toUpperCase();
    return;
  }

  // <chr:XX> - Character by hex code
  const chrMatch = tagContent.match(/^chr:([0-9A-Fa-f]{2})$/i);
  if (chrMatch) {
    const charCode = hexToDec(chrMatch[1]);
    writeChar(String.fromCharCode(charCode));
    return;
  }

  // <p> and </p> - treated as text blocks (no special handling needed)
  if (lowerTag === 'p' || lowerTag === '/p') {
    return;
  }
}

/**
 * Write a character at current cursor position
 */
function writeChar(char) {
  if (cursorRow >= ROWS) return;
  if (cursorCol >= COLS) {
    // Wrap to next line
    cursorCol = 0;
    cursorRow++;
    if (cursorRow >= ROWS) return;
  }

  screenBuffer[cursorRow][cursorCol] = char;
  colorBuffer[cursorRow][cursorCol] = { fg: currentFg, bg: currentBg };
  cursorCol++;
}

/**
 * Check if a cell is part of a link
 */
function isLinkCell(row, col) {
  for (const link of links) {
    if (row === link.startRow && row === link.endRow) {
      // Single-line link
      if (col >= link.startCol && col < link.endCol) {
        return link;
      }
    } else if (row === link.startRow && col >= link.startCol) {
      return link;
    } else if (row === link.endRow && col < link.endCol) {
      return link;
    } else if (row > link.startRow && row < link.endRow) {
      return link;
    }
  }
  return null;
}

/**
 * Render screen buffer to DOM
 */
function renderScreen() {
  const container = document.getElementById('screenContent');
  container.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'char-row';

    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('span');
      cell.className = 'char-cell';

      const colors = colorBuffer[r][c];
      const fgColor = TI_COLORS[colors.fg] || TI_COLORS['F'];
      const bgColor = TI_COLORS[colors.bg] || TI_COLORS['4'];

      cell.style.color = fgColor;
      if (bgColor !== 'transparent') {
        cell.style.backgroundColor = bgColor;
      }

      // Check if this cell is part of a link
      const link = isLinkCell(r, c);
      if (link) {
        cell.classList.add('link');
        cell.title = `Link: ${link.href}`;
        cell.dataset.href = link.href;
      }

      // Use non-breaking space for empty cells
      cell.textContent = screenBuffer[r][c] === ' ' ? '\u00A0' : screenBuffer[r][c];

      rowDiv.appendChild(cell);
    }

    container.appendChild(rowDiv);
  }
}

/**
 * Update status bar
 */
function updateStatus() {
  const cursorPosEl = document.getElementById('cursorPos');
  const linkCountEl = document.getElementById('linkCount');

  const rowHex = cursorRow.toString(16).toUpperCase().padStart(2, '0');
  const colHex = cursorCol.toString(16).toUpperCase().padStart(2, '0');

  cursorPosEl.textContent = `Cursor: ${rowHex}:${colHex}`;
  linkCountEl.textContent = `Links: ${links.length}`;
}

/**
 * Load sample 99ML
 */
function loadSample() {
  const sample = `<99ml>
<clr:F:4><pos:00:0C>*** TI-99/4A ***
<clr:B:4><pos:01:08>Stuart's Web Browser Demo
<clr:F:4><pos:03:00>Welcome to the 99ML Simulator!
<pos:04:00>This tool helps preview how pages
<pos:05:00>will appear on the TI-99/4A.
<clr:3:4><pos:07:00>Features:
<clr:F:4><pos:08:02>- 40x24 character display
<pos:09:02>- 16 color palette
<pos:0A:02>- Hex positioning (pos:YY:XX)
<pos:0B:02>- Color control (clr:FG:BG)
<clr:7:4><pos:0D:00>Navigation:
<clr:F:4><a href="page2.99ml" pos="0E00">Next Page</a>
<a href="index.99ml" pos="0F00">Home</a>
<a href="help.99ml" pos="1000">Help</a>
<clr:E:4><pos:16:00>────────────────────────────────────────
<clr:B:4><pos:17:0A>Created with 99ML Simulator
</99ml>`;

  document.getElementById('sourceInput').value = sample;
}

/**
 * Get configured server URL
 */
function getServerUrl() {
  let url = document.getElementById('serverUrlInput').value.trim();
  // Remove trailing slash if present
  return url.replace(/\/$/, '');
}

/**
 * Convert URL using server
 * @param {string} [overrideUrl] Optional URL to convert (used for links)
 */
async function convertUrl(overrideUrl) {
  const urlInput = document.getElementById('urlInput');
  const statusEl = document.getElementById('converterStatus');
  const serverUrl = getServerUrl();

  // Use override URL if provided, otherwise get from input
  let url = overrideUrl || urlInput.value.trim();

  // Update input if we're following a link
  if (overrideUrl) {
    urlInput.value = url;
  }

  // Save server URL preference
  localStorage.setItem('99ml_server_url', serverUrl);

  if (!url) {
    statusEl.className = 'status-message error';
    statusEl.textContent = 'Please enter a URL';
    return;
  }

  if (!serverUrl) {
    statusEl.className = 'status-message error';
    statusEl.textContent = 'Please configure Converter Server URL';
    return;
  }

  // Ensure URL has protocol
  let targetUrl = url;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // Resolve relative URLs if we have a base (though converter usually gives absolute)
  try {
    // If we are navigating from a previous page, we might ideally resolve against it
    // But for now, we assume the converter returns absolute links or we treat them as new navigation
  } catch (e) {
    console.warn('URL resolution error', e);
  }

  statusEl.className = 'status-message loading';
  statusEl.textContent = 'Converting...';

  try {
    const target = `${serverUrl}/convert?url=${encodeURIComponent(targetUrl)}`;
    console.log(`Requesting conversion from: ${target}`);

    // Remove bypass header to avoid CORS preflight issues with localtunnel
    // Instead, we'll detect the HTML warning page in the response
    const response = await fetch(target);

    // Check for the localtunnel warning page (it returns 200 OK but with HTML)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error('TUNNEL_PROTECTION');
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Put converted 99ML into source editor
    document.getElementById('sourceInput').value = data.content;

    // Auto-render the new content
    parse99ML(data.content);

    statusEl.className = 'status-message success';
    statusEl.textContent = 'Loaded: ' + (new URL(targetUrl).hostname);

  } catch (error) {
    statusEl.className = 'status-message error';

    if (error.message === 'TUNNEL_PROTECTION') {
      statusEl.innerHTML = `Tunnel protection active. <a href="${serverUrl}" target="_blank" style="color: inherit; text-decoration: underline; font-weight: bold;">Click here to open Server</a>, click "Click to Continue", then try again.`;
    } else if (error.message.includes('Failed to fetch')) {
      statusEl.innerHTML = `Network Error. Possible causes:<br>
      1. Server URL is incorrect<br>
      2. Server is not running<br>
      3. HTTPS/SSL error (try opening URL in new tab)<br>
      4. CORS issue`;
    } else {
      statusEl.textContent = `Error: ${error.message}`;
    }
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load saved server URL
  const savedServerUrl = localStorage.getItem('99ml_server_url');
  if (savedServerUrl) {
    document.getElementById('serverUrlInput').value = savedServerUrl;
  }

  // Initialize with empty screen
  initScreen();
  renderScreen();
  updateStatus();

  // Render button
  document.getElementById('renderBtn').addEventListener('click', () => {
    const source = document.getElementById('sourceInput').value;
    parse99ML(source);
  });

  // Load sample button
  document.getElementById('loadSample').addEventListener('click', loadSample);

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('sourceInput').value = '';
    initScreen();
    renderScreen();
    updateStatus();
    updateStatus();
  });

  // Aspect Ratio Toggle
  const aspectToggle = document.getElementById('aspectRatioToggle');
  const crtScreen = document.getElementById('crtScreen');

  // Load saved preference
  if (localStorage.getItem('99ml_aspect_43') === 'true') {
    aspectToggle.checked = true;
    crtScreen.classList.add('aspect-4-3');
  }

  aspectToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      crtScreen.classList.add('aspect-4-3');
      localStorage.setItem('99ml_aspect_43', 'true');
    } else {
      crtScreen.classList.remove('aspect-4-3');
      localStorage.setItem('99ml_aspect_43', 'false');
    }
  });

  // Convert button
  document.getElementById('convertBtn').addEventListener('click', () => convertUrl());

  // URL input - convert on Enter
  document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      convertUrl();
    }
  });

  // Click on links
  document.getElementById('screenContent').addEventListener('click', (e) => {
    if (e.target.classList.contains('link')) {
      const href = e.target.dataset.href;

      // Handle special 99ml file links (like in the sample)
      if (href.endsWith('.99ml')) {
        alert('Local .99ml file links are not supported in dynamic mode yet.');
        return;
      }

      console.log('Following link:', href);
      convertUrl(href);
    }
  });
});

// Export for potential module use
export { parse99ML, initScreen, renderScreen };
