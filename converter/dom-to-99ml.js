/**
 * DOM to 99ML Converter
 * Extracts visible text and links from webpages and converts to 99ML format
 */

import puppeteer from 'puppeteer';
import { toHex, mapColorToTI, truncateText } from './utils.js';

// TI-99/4A screen dimensions
const COLS = 40;
const ROWS = 24;

// Viewport dimensions for consistent rendering
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

/**
 * Convert a URL to 99ML markup
 */
export async function convertUrlTo99ML(url) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        // Navigate and wait for network idle
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Extract page data
        const pageData = await extractPageData(page);

        // Convert to 99ML
        const result = generateML(pageData, url);

        return result;

    } finally {
        await browser.close();
    }
}

/**
 * Convert HTML string to 99ML
 */
export async function convertHtmlTo99ML(html) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        // Load HTML content
        await page.setContent(html, { waitUntil: 'networkidle2' });

        // Extract page data
        const pageData = await extractPageData(page);

        // Convert to 99ML
        const result = generateML(pageData, 'local');

        return result;

    } finally {
        await browser.close();
    }
}

/**
 * Extract text nodes and links from rendered page
 */
async function extractPageData(page) {
    return await page.evaluate((viewportWidth, viewportHeight) => {
        const data = {
            title: document.title || '',
            textNodes: [],
            links: []
        };

        // Calculate character cell size
        const charWidth = viewportWidth / 40;  // Map viewport to 40 cols
        const charHeight = viewportHeight / 24; // Map viewport to 24 rows

        // Helper to get element position in grid coordinates
        function getGridPos(rect) {
            const col = Math.floor(rect.left / charWidth);
            const row = Math.floor(rect.top / charHeight);
            return {
                row: Math.max(0, Math.min(23, row)),
                col: Math.max(0, Math.min(39, col))
            };
        }

        // Helper to check if element is visible
        function isVisible(el) {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                rect.width > 0 &&
                rect.height > 0 &&
                rect.top < viewportHeight &&
                rect.bottom > 0 &&
                rect.left < viewportWidth
            );
        }

        // Walk all text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent.trim();
                    if (!text) return NodeFilter.FILTER_REJECT;

                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    // Skip script/style
                    const tag = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript', 'meta'].includes(tag)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            const rect = parent.getBoundingClientRect();
            const pos = getGridPos(rect);
            const style = window.getComputedStyle(parent);

            // Check if this is part of a link
            const linkEl = parent.closest('a');
            const isLink = !!linkEl;
            const href = linkEl ? linkEl.href : null;

            // Get text content (cleaned)
            let text = node.textContent
                .replace(/\s+/g, ' ')
                .trim();

            if (!text) continue;

            data.textNodes.push({
                text,
                row: pos.row,
                col: pos.col,
                isHeading: /^h[1-6]$/i.test(parent.tagName),
                isLink,
                href,
                color: style.color,
                bgColor: style.backgroundColor
            });
        }

        // Also extract links separately for better tracking
        document.querySelectorAll('a[href]').forEach(link => {
            if (!isVisible(link)) return;

            const rect = link.getBoundingClientRect();
            const pos = getGridPos(rect);
            const text = link.textContent.replace(/\s+/g, ' ').trim();

            if (text) {
                data.links.push({
                    text,
                    href: link.href,
                    row: pos.row,
                    col: pos.col
                });
            }
        });

        return data;
    }, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
}

/**
 * Generate 99ML markup from extracted page data
 */
function generateML(pageData, sourceUrl) {
    // Create a grid to track what's placed
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = new Array(COLS).fill(null);
    }

    const mlParts = ['<99ml>'];

    // Set default colors
    mlParts.push('<clr:F:4>');

    // Add title at top (centered)
    if (pageData.title) {
        const title = truncateText(pageData.title, COLS);
        const startCol = Math.floor((COLS - title.length) / 2);
        mlParts.push(`<clr:B:4><pos:00:${toHex(startCol)}>${title}`);

        // Mark grid cells as used
        for (let i = 0; i < title.length; i++) {
            grid[0][startCol + i] = 'title';
        }
    }

    // Sort text nodes by position (top to bottom, left to right)
    const sortedNodes = pageData.textNodes
        .filter(node => node.row > 0) // Skip overlap with title row
        .sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });

    // Track placed links
    const placedLinks = new Set();

    // Process text nodes
    for (const node of sortedNodes) {
        // Skip if this row is too far down
        if (node.row >= ROWS - 2) continue;

        // Find available space in this row
        let startCol = node.col;
        while (startCol < COLS && grid[node.row][startCol]) {
            startCol++;
        }

        if (startCol >= COLS) continue;

        // Calculate available width
        let availWidth = COLS - startCol;

        // Truncate text to fit
        const text = truncateText(node.text, availWidth);
        if (!text) continue;

        // Determine color
        let colorTag = '<clr:F:4>';
        if (node.isHeading) {
            colorTag = '<clr:B:4>'; // Light yellow for headings
        } else if (node.isLink) {
            colorTag = '<clr:7:4>'; // Cyan for links
        }

        // Position and add text
        const posTag = `<pos:${toHex(node.row)}:${toHex(startCol)}>`;

        if (node.isLink && node.href && !placedLinks.has(node.href)) {
            // It's a link - wrap in <a> tag
            mlParts.push(`${colorTag}${posTag}<a href="${node.href}">${text}</a>`);
            placedLinks.add(node.href);
        } else if (!node.isLink) {
            mlParts.push(`${colorTag}${posTag}${text}`);
        }

        // Mark grid cells as used
        for (let i = 0; i < text.length && (startCol + i) < COLS; i++) {
            if (node.row < ROWS) {
                grid[node.row][startCol + i] = 'text';
            }
        }
    }

    // Add footer with source
    const footer = `Source: ${new URL(sourceUrl).hostname}`.substring(0, COLS);
    const footerCol = Math.floor((COLS - footer.length) / 2);
    mlParts.push(`<clr:E:4><pos:17:${toHex(footerCol)}>${footer}`);

    mlParts.push('</99ml>');

    return {
        content: mlParts.join('\n'),
        metadata: {
            title: pageData.title,
            textNodesFound: pageData.textNodes.length,
            linksFound: pageData.links.length,
            linksPlaced: placedLinks.size
        }
    };
}
