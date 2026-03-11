import { convert, type HtmlToTextOptions } from "html-to-text";

/**
 * Converts HTML content to clean, readable plain text.
 *
 * This function is used when importing Gmail messages that only have HTML content
 * and no plain text alternative. It strips HTML tags while preserving readable
 * structure (line breaks, links, lists, etc.).
 *
 * @param html - The HTML string to convert
 * @returns Plain text representation of the HTML content
 *
 * @example
 * ```typescript
 * const html = '<p>Hello <strong>world</strong>!</p>';
 * const text = convertHtmlToText(html);
 * // Returns: "Hello world!"
 * ```
 */
export function convertHtmlToText(html: string): string {
  if (!html || html.trim() === "") {
    return "";
  }

  try {
    const options: HtmlToTextOptions = {
      // Preserve line breaks and paragraph structure
      wordwrap: false,

      // Configure how different elements are handled
      selectors: [
        // Paragraphs get newlines before/after
        {
          selector: "p",
          options: { leadingLineBreaks: 1, trailingLineBreaks: 1 },
        },

        // Headers get extra spacing
        {
          selector: "h1",
          options: {
            uppercase: false,
            leadingLineBreaks: 2,
            trailingLineBreaks: 2,
          },
        },
        {
          selector: "h2",
          options: {
            uppercase: false,
            leadingLineBreaks: 2,
            trailingLineBreaks: 1,
          },
        },
        {
          selector: "h3",
          options: {
            uppercase: false,
            leadingLineBreaks: 2,
            trailingLineBreaks: 1,
          },
        },
        {
          selector: "h4",
          options: {
            uppercase: false,
            leadingLineBreaks: 1,
            trailingLineBreaks: 1,
          },
        },
        {
          selector: "h5",
          options: {
            uppercase: false,
            leadingLineBreaks: 1,
            trailingLineBreaks: 1,
          },
        },
        {
          selector: "h6",
          options: {
            uppercase: false,
            leadingLineBreaks: 1,
            trailingLineBreaks: 1,
          },
        },

        // Lists
        {
          selector: "ul",
          options: { leadingLineBreaks: 1, trailingLineBreaks: 1 },
        },
        {
          selector: "ol",
          options: { leadingLineBreaks: 1, trailingLineBreaks: 1 },
        },

        // Links show the URL in parentheses
        { selector: "a", options: { ignoreHref: false } },

        // Tables are converted to plain text
        { selector: "table", options: { uppercaseHeaderCells: false } },

        // Remove images (keep alt text if present)
        { selector: "img", format: "skip" },

        // Skip scripts, styles, and other non-content elements
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "noscript", format: "skip" },
        { selector: "svg", format: "skip" },
      ],

      // Decode HTML entities
      decodeEntities: true,

      // Preserve whitespace structure
      preserveNewlines: true,
    };

    const text = convert(html, options);

    // Clean up excessive newlines (more than 2 consecutive)
    const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

    return cleaned;
  } catch (error) {
    console.error("Error converting HTML to text:", error);
    // Fallback: simple regex-based stripping if conversion fails
    const fallbackText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    return fallbackText;
  }
}
