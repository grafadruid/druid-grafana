/*
 * Pure parsing helpers for the Druid SQL docs generator.
 *
 * Ported from Apache Druid's web-console/script/create-sql-docs.mjs
 * (https://github.com/apache/druid, Apache License 2.0). Kept as a standalone
 * CommonJS module so it can be imported both by the ESM generator
 * (scripts/generate-druid-sql-docs.mjs) and by the jest test suite under src/.
 *
 * Unlike upstream, descriptions are kept as Markdown (Monaco renders Markdown in
 * hover/completion widgets) rather than converted to HTML.
 */

const FUNCTION_ROW = /^\|\s*`(\w+)\(([^|]*)\)`\s*\|([^|]+)\|(?:([^|]+)\|)?$/;
const DATA_TYPE_ROW = /^\|([A-Z]+)\|([A-Z]+)\|([^|]*)\|([^|]*)\|$/;
// Niladic entries such as CURRENT_TIMESTAMP, CURRENT_DATE and PI are documented without parens, so
// FUNCTION_ROW misses them. Restricted to UPPERCASE names on purpose: the same row shape is used for
// example column names in the window-function docs (`channel`, `time_hour`, ...), which are lowercase.
const NILADIC_ROW = /^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|([^|]+)\|/;

function hasHtmlTags(str) {
  return /<(a|br|span|div|p|code)\/?>/.test(str);
}

// Convert the upstream hack used to render a literal pipe inside a markdown table.
function sanitizeArguments(str) {
  return str.replace(/`<code>&#124;<\/code>`/g, '|');
}

// Keep the text as Markdown: strip links, turn <br> into newlines, trim.
function cleanDescription(markdown) {
  return markdown
    .replace(/<br\s*\/?>/gi, '\n') // inline <br>, <br/>, <br /> -> newline
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .trim();
}

// Parse a single markdown line into a [name, args, description] tuple, or null.
function parseFunctionRow(line) {
  const m = line.match(FUNCTION_ROW);
  if (!m) {
    return null;
  }
  return {
    name: m[1],
    args: sanitizeArguments(m[2]),
    description: cleanDescription(m[3].trim()),
  };
}

// Parse a single markdown line into a data-type entry, or null.
function parseDataTypeRow(line) {
  const m = line.match(DATA_TYPE_ROW);
  if (!m) {
    return null;
  }
  return {
    name: m[1],
    runtime: m[2],
    description: cleanDescription(m[4]),
  };
}

// Parse a single markdown line into a niladic entry (documented without parens), or null.
function parseNiladicRow(line) {
  const m = line.match(NILADIC_ROW);
  if (!m) {
    return null;
  }
  return {
    name: m[1],
    args: '',
    description: cleanDescription(m[2].trim()),
  };
}

// Parse a full concatenated markdown blob into { functions, dataTypes } maps. Niladic entries land in
// `functions` with an empty `args`, which is what marks them as taking no argument list.
function parseDruidSqlDocs(markdown) {
  const functions = {};
  const dataTypes = {};
  for (const line of markdown.split('\n')) {
    const fn = parseFunctionRow(line) ?? parseNiladicRow(line);
    if (fn) {
      functions[fn.name] = { args: fn.args, description: fn.description };
    }
    const dt = parseDataTypeRow(line);
    if (dt) {
      dataTypes[dt.name] = { runtime: dt.runtime, description: dt.description };
    }
  }
  return { functions, dataTypes };
}

module.exports = {
  hasHtmlTags,
  sanitizeArguments,
  cleanDescription,
  parseFunctionRow,
  parseDataTypeRow,
  parseNiladicRow,
  parseDruidSqlDocs,
};
