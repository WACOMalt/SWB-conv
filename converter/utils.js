/**
 * Utility functions for 99ML conversion
 */

/**
 * Convert decimal to uppercase 2-digit hex
 */
export function toHex(num) {
    return Math.max(0, Math.min(255, Math.floor(num)))
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
}

/**
 * Truncate text to fit width, adding ellipsis if needed
 */
export function truncateText(text, maxWidth) {
    if (!text) return '';

    // Clean the text
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length <= maxWidth) {
        return text;
    }

    if (maxWidth <= 3) {
        return text.substring(0, maxWidth);
    }

    return text.substring(0, maxWidth - 3) + '...';
}

/**
 * TI-99/4A color palette for mapping
 */
const TI_PALETTE = [
    { code: '0', r: 0, g: 0, b: 0, name: 'transparent' },
    { code: '1', r: 0, g: 0, b: 0, name: 'black' },
    { code: '2', r: 33, g: 200, b: 66, name: 'medium-green' },
    { code: '3', r: 94, g: 220, b: 120, name: 'light-green' },
    { code: '4', r: 84, g: 85, b: 237, name: 'dark-blue' },
    { code: '5', r: 125, g: 118, b: 252, name: 'light-blue' },
    { code: '6', r: 212, g: 82, b: 77, name: 'dark-red' },
    { code: '7', r: 66, g: 235, b: 245, name: 'cyan' },
    { code: '8', r: 252, g: 85, b: 84, name: 'medium-red' },
    { code: '9', r: 255, g: 121, b: 120, name: 'light-red' },
    { code: 'A', r: 212, g: 193, b: 84, name: 'dark-yellow' },
    { code: 'B', r: 230, g: 206, b: 128, name: 'light-yellow' },
    { code: 'C', r: 33, g: 176, b: 59, name: 'dark-green' },
    { code: 'D', r: 201, g: 91, b: 186, name: 'magenta' },
    { code: 'E', r: 204, g: 204, b: 204, name: 'grey' },
    { code: 'F', r: 255, g: 255, b: 255, name: 'white' },
];

/**
 * Parse CSS color string to RGB
 */
export function parseColor(colorStr) {
    if (!colorStr) return null;

    // Handle rgb/rgba
    const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        };
    }

    // Handle hex colors
    const hexMatch = colorStr.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (hexMatch) {
        return {
            r: parseInt(hexMatch[1], 16),
            g: parseInt(hexMatch[2], 16),
            b: parseInt(hexMatch[3], 16)
        };
    }

    // Handle 3-digit hex
    const hex3Match = colorStr.match(/#([0-9a-f])([0-9a-f])([0-9a-f])/i);
    if (hex3Match) {
        return {
            r: parseInt(hex3Match[1] + hex3Match[1], 16),
            g: parseInt(hex3Match[2] + hex3Match[2], 16),
            b: parseInt(hex3Match[3] + hex3Match[3], 16)
        };
    }

    return null;
}

/**
 * Calculate color distance (Euclidean in RGB space)
 */
function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Map CSS color to nearest TI-99/4A palette color
 */
export function mapColorToTI(colorStr) {
    const rgb = parseColor(colorStr);

    if (!rgb) {
        return 'F'; // Default to white
    }

    // Check for near-black
    if (rgb.r < 30 && rgb.g < 30 && rgb.b < 30) {
        return '1';
    }

    // Check for near-white
    if (rgb.r > 225 && rgb.g > 225 && rgb.b > 225) {
        return 'F';
    }

    // Find closest color in palette (skip transparent)
    let closestCode = 'F';
    let closestDistance = Infinity;

    for (const palColor of TI_PALETTE) {
        if (palColor.code === '0') continue; // Skip transparent

        const dist = colorDistance(rgb, palColor);
        if (dist < closestDistance) {
            closestDistance = dist;
            closestCode = palColor.code;
        }
    }

    return closestCode;
}

/**
 * Word-wrap text to fit within width
 */
export function wordWrap(text, width) {
    if (!text || width <= 0) return [];

    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (!word) continue;

        if (currentLine.length === 0) {
            currentLine = word;
        } else if (currentLine.length + 1 + word.length <= width) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}
