/**
 * Comprehensive test suite for parser.js
 * Tests all .env parsing and stringification functionality
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const parser = require('../src/parser.js');

describe('parser.js - Basic Parsing', () => {
  it('should parse simple KEY=VALUE', () => {
    const content = 'KEY=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should parse multiple key-value pairs', () => {
    const content = 'KEY1=value1\nKEY2=value2\nKEY3=value3';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, {
      KEY1: 'value1',
      KEY2: 'value2',
      KEY3: 'value3'
    });
  });

  it('should trim whitespace around keys and values', () => {
    const content = '  KEY  =  value  ';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should handle empty lines', () => {
    const content = 'KEY1=value1\n\n\nKEY2=value2';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, {
      KEY1: 'value1',
      KEY2: 'value2'
    });
  });

  it('should handle empty string', () => {
    const result = parser.parse('');
    assert.deepStrictEqual(result, {});
  });

  it('should handle null input', () => {
    const result = parser.parse(null);
    assert.deepStrictEqual(result, {});
  });

  it('should handle undefined input', () => {
    const result = parser.parse(undefined);
    assert.deepStrictEqual(result, {});
  });

  it('should handle non-string input', () => {
    const result = parser.parse(123);
    assert.deepStrictEqual(result, {});
  });
});

describe('parser.js - Comments', () => {
  it('should ignore comment lines starting with #', () => {
    const content = '# This is a comment\nKEY=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should ignore multiple comment lines', () => {
    const content = '# Comment 1\n# Comment 2\nKEY=value\n# Comment 3';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should handle inline comments in unquoted values', () => {
    const content = 'KEY=value # inline comment';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should not treat # as comment in double quotes', () => {
    const content = 'KEY="value # not a comment"';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value # not a comment' });
  });

  it('should handle # in single quotes', () => {
    const content = "KEY='value # not a comment'";
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value # not a comment' });
  });
});

describe('parser.js - Quoted Values', () => {
  it('should parse single-quoted values', () => {
    const content = "KEY='single quoted value'";
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'single quoted value' });
  });

  it('should parse double-quoted values', () => {
    const content = 'KEY="double quoted value"';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'double quoted value' });
  });

  it('should preserve spaces in quoted values', () => {
    const content = 'KEY="  spaces  around  "';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: '  spaces  around  ' });
  });

  it('should handle empty single-quoted value', () => {
    const content = "KEY=''";
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: '' });
  });

  it('should handle empty double-quoted value', () => {
    const content = 'KEY=""';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: '' });
  });

  it('should handle quotes within opposite quote type', () => {
    const content = `KEY1="it's quoted"\nKEY2='say "hello"'`;
    const result = parser.parse(content);
    assert.deepStrictEqual(result, {
      KEY1: "it's quoted",
      KEY2: 'say "hello"'
    });
  });
});

describe('parser.js - Escape Sequences', () => {
  it('should unescape \\n to newline', () => {
    const content = 'KEY="line1\\nline2"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'line1\nline2');
  });

  it('should unescape \\r to carriage return', () => {
    const content = 'KEY="text\\rwith\\rcarriage"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'text\rwith\rcarriage');
  });

  it('should unescape \\t to tab', () => {
    const content = 'KEY="tab\\there"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'tab\there');
  });

  it('should unescape \\" to double quote', () => {
    const content = 'KEY="say \\"hello\\""';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'say "hello"');
  });

  it('should unescape \\\\ to backslash', () => {
    const content = 'KEY="back\\\\slash"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'back\\slash');
  });

  it('should handle multiple escape sequences', () => {
    const content = 'KEY="line1\\nline2\\ttabbed\\r\\nwindows"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'line1\nline2\ttabbed\r\nwindows');
  });

  it('should not unescape in single quotes', () => {
    const content = "KEY='\\n\\t\\r'";
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, '\\n\\t\\r');
  });
});

describe('parser.js - Multiline Values', () => {
  it('should parse multiline double-quoted values', () => {
    const content = 'KEY="line 1\nline 2\nline 3"';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'line 1\nline 2\nline 3');
  });

  it('should handle unclosed quote spanning multiple lines', () => {
    const content = 'KEY="line 1\nline 2\nline 3"';
    const result = parser.parse(content);
    assert.ok(result.KEY.includes('line 1'));
    assert.ok(result.KEY.includes('line 2'));
  });

  it('should handle trailing whitespace after closing quote on multiline values', () => {
    // BUG-002: Parser incorrectly removed trailing whitespace char instead of closing quote
    const content = 'KEY="first line\nsecond line"   \nOTHER=value';
    const result = parser.parse(content);
    assert.strictEqual(result.KEY, 'first line\nsecond line');
    assert.strictEqual(result.OTHER, 'value');
  });

  it('should warn about unclosed double quotes at EOF', () => {
    // BUG-003: Unclosed quotes consume entire file
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    const content = 'KEY="unclosed value\nmore lines';
    const result = parser.parse(content);

    console.warn = originalWarn;

    assert.strictEqual(result.KEY, 'unclosed value\nmore lines');
    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0].includes('Unclosed double quote'));
  });
});

describe('parser.js - Edge Cases', () => {
  it('should handle empty value', () => {
    const content = 'KEY=';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: '' });
  });

  it('should handle value with equals sign', () => {
    const content = 'KEY=value=with=equals';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value=with=equals' });
  });

  it('should skip lines without equals sign', () => {
    const content = 'INVALID LINE\nKEY=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should skip lines with empty key', () => {
    const content = '=value\nKEY=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY: 'value' });
  });

  it('should handle keys with underscores', () => {
    const content = 'MY_KEY_NAME=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { MY_KEY_NAME: 'value' });
  });

  it('should handle keys with numbers', () => {
    const content = 'KEY123=value';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { KEY123: 'value' });
  });

  it('should handle numeric values', () => {
    const content = 'PORT=3000';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { PORT: '3000' });
  });

  it('should handle boolean-like values', () => {
    const content = 'DEBUG=true\nENABLED=false';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { DEBUG: 'true', ENABLED: 'false' });
  });

  it('should handle URL values', () => {
    const content = 'DATABASE_URL=postgresql://user:pass@localhost:5432/db';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
    });
  });

  it('should handle JSON-like values', () => {
    const content = 'CONFIG={"key":"value"}';
    const result = parser.parse(content);
    assert.deepStrictEqual(result, { CONFIG: '{"key":"value"}' });
  });
});

describe('parser.js - Real World Examples', () => {
  it('should parse typical .env file', () => {
    const content = `# Database
DATABASE_URL=postgresql://localhost:5432/mydb
DB_USER=admin
DB_PASS=secret123

# API Keys
API_KEY=sk_test_123456
API_SECRET="my-secret-key"

# Configuration
DEBUG=true
PORT=3000
NODE_ENV=development`;

    const result = parser.parse(content);
    assert.strictEqual(result.DATABASE_URL, 'postgresql://localhost:5432/mydb');
    assert.strictEqual(result.DB_USER, 'admin');
    assert.strictEqual(result.DB_PASS, 'secret123');
    assert.strictEqual(result.API_KEY, 'sk_test_123456');
    assert.strictEqual(result.API_SECRET, 'my-secret-key');
    assert.strictEqual(result.DEBUG, 'true');
    assert.strictEqual(result.PORT, '3000');
    assert.strictEqual(result.NODE_ENV, 'development');
  });
});

describe('parser.js - Stringify', () => {
  it('should stringify simple object', () => {
    const obj = { KEY: 'value' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY=value');
  });

  it('should stringify multiple key-value pairs', () => {
    const obj = { KEY1: 'value1', KEY2: 'value2' };
    const result = parser.stringify(obj);
    assert.ok(result.includes('KEY1=value1'));
    assert.ok(result.includes('KEY2=value2'));
  });

  it('should quote values with newlines', () => {
    const obj = { KEY: 'line1\nline2' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY="line1\\nline2"');
  });

  it('should quote values with spaces', () => {
    const obj = { KEY: ' value with spaces ' };
    const result = parser.stringify(obj);
    assert.ok(result.includes('"'));
  });

  it('should quote values with # character', () => {
    const obj = { KEY: 'value # comment' };
    const result = parser.stringify(obj);
    assert.ok(result.includes('"'));
  });

  it('should escape double quotes in values', () => {
    const obj = { KEY: 'say "hello"' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY="say \\"hello\\""');
  });

  it('should escape backslashes', () => {
    const obj = { KEY: 'path\\to\\file' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY="path\\\\to\\\\file"');
  });

  it('should handle empty values', () => {
    const obj = { KEY: '' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY=');
  });

  it('should handle null values', () => {
    const obj = { KEY: null };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY=');
  });

  it('should handle undefined values', () => {
    const obj = { KEY: undefined };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY=');
  });

  it('should convert non-string values to strings', () => {
    const obj = { PORT: 3000, DEBUG: true };
    const result = parser.stringify(obj);
    assert.ok(result.includes('PORT=3000'));
    assert.ok(result.includes('DEBUG=true'));
  });

  it('should handle empty object', () => {
    const obj = {};
    const result = parser.stringify(obj);
    assert.strictEqual(result, '');
  });

  it('should handle null input', () => {
    const result = parser.stringify(null);
    assert.strictEqual(result, '');
  });

  it('should handle undefined input', () => {
    const result = parser.stringify(undefined);
    assert.strictEqual(result, '');
  });

  it('should skip invalid keys', () => {
    const obj = { '': 'value', KEY: 'valid' };
    const result = parser.stringify(obj);
    assert.ok(result.includes('KEY=valid'));
    assert.ok(!result.includes('=value'));
  });

  it('should handle tabs in values', () => {
    const obj = { KEY: 'tab\there' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY="tab\\there"');
  });

  it('should handle carriage returns', () => {
    const obj = { KEY: 'text\rwith\rcarriage' };
    const result = parser.stringify(obj);
    assert.strictEqual(result, 'KEY="text\\rwith\\rcarriage"');
  });
});

describe('parser.js - Round Trip (Parse -> Stringify -> Parse)', () => {
  it('should maintain data integrity through parse/stringify cycle', () => {
    const original = {
      KEY1: 'simple',
      KEY2: 'value with spaces',
      KEY3: 'line1\nline2',
      KEY4: 'special "chars"',
      KEY5: 'path\\to\\file'
    };

    const stringified = parser.stringify(original);
    const parsed = parser.parse(stringified);

    assert.strictEqual(parsed.KEY1, original.KEY1);
    assert.strictEqual(parsed.KEY2, original.KEY2);
    assert.strictEqual(parsed.KEY3, original.KEY3);
    assert.strictEqual(parsed.KEY4, original.KEY4);
    assert.strictEqual(parsed.KEY5, original.KEY5);
  });

  it('should handle complex real-world data', () => {
    const content = `DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY="sk_test_1234567890"
SECRET="my \\"secret\\" value"
MULTILINE="line1\\nline2\\nline3"
PATH="C:\\\\Users\\\\Documents"`;

    const parsed = parser.parse(content);
    const stringified = parser.stringify(parsed);
    const reparsed = parser.parse(stringified);

    assert.deepStrictEqual(reparsed, parsed);
  });
});
