/**
 * @oxog/env-lock - Environment File Parser
 *
 * Custom .env file parser with zero dependencies.
 * Handles KEY=VALUE pairs, comments, and quoted values.
 *
 * @author Ersin Koc
 * @license MIT
 */

/**
 * Parses .env file content into a key-value object
 *
 * Supports:
 * - KEY=VALUE format
 * - Comments starting with #
 * - Single and double quoted values
 * - Empty lines
 * - Whitespace trimming
 * - Multiline values in quotes
 *
 * @param {string} content - The .env file content to parse
 * @returns {Object} Object containing parsed key-value pairs
 */
function parse(content) {
  if (!content || typeof content !== 'string') {
    return {};
  }

  const result = {};
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    let line = lines[i].trim();

    // Skip empty lines
    if (line === '') {
      i++;
      continue;
    }

    // Skip comments
    if (line.startsWith('#')) {
      i++;
      continue;
    }

    // Find the first '=' to split key and value
    const equalIndex = line.indexOf('=');

    // Skip lines without '='
    if (equalIndex === -1) {
      i++;
      continue;
    }

    // Extract key and value
    const key = line.substring(0, equalIndex).trim();
    let value = line.substring(equalIndex + 1).trim();

    // Skip if key is empty
    if (key === '') {
      i++;
      continue;
    }

    // Handle quoted values
    if (value.length > 0) {
      const firstChar = value[0];
      const lastChar = value[value.length - 1];

      // Handle single quotes
      if (firstChar === "'" && lastChar === "'") {
        value = value.substring(1, value.length - 1);
      }
      // Handle double quotes (may span multiple lines)
      else if (firstChar === '"') {
        // Check if the quote is closed on the same line
        if (lastChar === '"' && value.length > 1) {
          // Remove surrounding quotes
          value = value.substring(1, value.length - 1);
          // Handle escape sequences in double quotes
          value = unescapeValue(value);
        } else {
          // Multi-line value: collect lines until we find closing quote
          let multilineValue = value.substring(1); // Remove opening quote
          i++;

          while (i < lines.length) {
            const nextLine = lines[i];
            const trimmedNextLine = nextLine.trimEnd();

            if (trimmedNextLine.endsWith('"')) {
              // Add line without trailing whitespace, then remove closing quote
              multilineValue += '\n' + trimmedNextLine.substring(0, trimmedNextLine.length - 1);
              break;
            }

            multilineValue += '\n' + nextLine;
            i++;
          }

          value = unescapeValue(multilineValue);
        }
      }
      // Unquoted value - take everything up to first # (inline comment)
      else {
        const commentIndex = value.indexOf('#');
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
      }
    }

    result[key] = value;
    i++;
  }

  return result;
}

/**
 * Unescapes common escape sequences in double-quoted values
 * @param {string} value - The value to unescape
 * @returns {string} Unescaped value
 */
function unescapeValue(value) {
  // Use a placeholder for escaped backslashes to prevent double-unescaping
  return value
    .replace(/\\\\/g, '\x00')   // Temporarily replace \\\\ with null byte
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\x00/g, '\\');    // Restore backslashes
}

/**
 * Serializes a key-value object into .env file format
 *
 * @param {Object} obj - Object containing key-value pairs
 * @returns {string} Serialized .env file content
 */
function stringify(obj) {
  if (!obj || typeof obj !== 'object') {
    return '';
  }

  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    // Skip invalid keys
    if (!key || typeof key !== 'string') {
      continue;
    }

    // Convert value to string
    const stringValue = value === null || value === undefined ? '' : String(value);

    // Check if value needs quoting
    const needsQuotes =
      stringValue.includes('\n') ||
      stringValue.includes('\r') ||
      stringValue.includes('\t') ||
      stringValue.includes('"') ||
      stringValue.includes('\\') ||
      stringValue.includes('#') ||
      stringValue.includes(' ');

    if (needsQuotes) {
      // Escape special characters and wrap in double quotes
      const escaped = stringValue
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      lines.push(`${key}="${escaped}"`);
    } else {
      lines.push(`${key}=${stringValue}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  parse,
  stringify
};
