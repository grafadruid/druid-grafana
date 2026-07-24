import { getStandardSQLCompletionProvider, type LanguageCompletionProvider, MacroType } from '@grafana/plugin-ui';
import type { Monaco, monacoTypes } from '@grafana/ui';
import { DruidDataSource } from '../../../DruidDataSource';
import { DRUID_DOCS_VERSION, SQL_FUNCTIONS, type SqlFunctionDoc } from './druidSqlDocs';
import { SQL_CONSTANTS, SQL_DYNAMICS, SQL_KEYWORDS, SQL_VOCABULARY_DOCS } from './keywords';
import { fetchTables, fetchColumns } from './metadata';

// Functions used *without* an argument list. `args === ''` alone cannot tell these apart from
// zero-argument functions: Druid documents window functions as `ROW_NUMBER()` (parens required) but
// CURRENT_TIMESTAMP/CURRENT_DATE/PI without any, so the niladic ones are listed explicitly.
export const NO_PAREN_FUNCTIONS = new Set<string>([...SQL_DYNAMICS, 'PI']);

// Keywords, constants and niladic functions — vocabulary plugin-ui never offers (its keyword
// suggestions are limited to a few clause keywords, and the vendored Druid keyword list only feeds
// the Monarch tokenizer). Completed as plain text, so multi-word entries like `GROUP BY` work too.
interface PlainWord {
  label: string;
  documentation?: string;
  /** Whether `documentation` came from the generated Druid catalog (drives the docs-version footer). */
  fromDruidDocs?: boolean;
  isKeyword: boolean;
}

export const PLAIN_WORDS: PlainWord[] = (() => {
  const byLabel = new Map<string, PlainWord>();
  for (const name of NO_PAREN_FUNCTIONS) {
    const druidDoc = SQL_FUNCTIONS[name]?.description;
    byLabel.set(name, {
      label: name,
      documentation: druidDoc ?? SQL_VOCABULARY_DOCS[name],
      fromDruidDocs: Boolean(druidDoc),
      isKeyword: false,
    });
  }
  for (const constant of SQL_CONSTANTS) {
    byLabel.set(constant, { label: constant, documentation: SQL_VOCABULARY_DOCS[constant], isKeyword: false });
  }
  for (const keyword of SQL_KEYWORDS) {
    if (!byLabel.has(keyword)) {
      byLabel.set(keyword, { label: keyword, isKeyword: true });
    }
  }
  return [...byLabel.values()];
})();

// The clause keywords plugin-ui already suggests contextually. Offering them again where it is active
// would show duplicate rows, so they are only added mid-statement (where it contributes nothing).
const ENGINE_KEYWORDS = new Set([
  'SELECT',
  'WITH',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'AND',
  'OR',
  'NOT',
  'LIKE',
  'BETWEEN',
  'IN',
  'IS',
  'ANY',
  'ALL',
  'SOME',
  'EXISTS',
]);

const SIMPLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

// ---------------------------------------------------------------------------------------------
// Mid-statement completion (works around a plugin-ui limitation)
//
// plugin-ui derives both the statement position and every suggestion's replacement range from the
// token *at* the caret. When the caret sits at the end of a partial word that is followed by more
// text on the same line — `SELECT diff| FROM wikipedia`, i.e. the normal flow when going back into
// an existing statement — that token is the following whitespace. Two things then break:
//   1. the position resolvers for the select list / WHERE clause do not match (they expect the
//      previous non-whitespace token to be the keyword), so only `FROM` is offered, and
//   2. `getStandardSuggestions` treats a whitespace token as an invalid range and collapses every
//      item's range to an empty range at the caret — so Monaco cannot filter by the typed prefix
//      and accepting an item inserts instead of replacing it (`SELECT d` + `*` -> `SELECT d*`).
//
// (2) is not reachable through the provider API (SQLEditor always overrides provideCompletionItems
// with its own), so for exactly this caret position we register a second Monaco completion provider
// that returns properly ranged items. Monaco merges results from all providers, and the guards below
// keep this provider silent wherever plugin-ui already behaves correctly, so nothing is duplicated.

const WORD_PREFIX = /[A-Za-z0-9_$]+$/;

// The partial word immediately before the caret ('' when the caret does not follow a word).
export const wordPrefixBefore = (line: string, column: number): string => {
  const match = WORD_PREFIX.exec(line.slice(0, Math.max(0, column - 1)));
  return match ? match[0] : '';
};

// Whether anything follows the caret on this line — when nothing does, plugin-ui sees the word
// itself as the current token and handles completion correctly, so we must stay out of the way.
export const hasTrailingContent = (line: string, column: number): boolean =>
  /\S/.test(line.slice(Math.max(0, column - 1)));

const CLAUSE_KEYWORDS = new Set([
  'select',
  'from',
  'join',
  'where',
  'group',
  'having',
  'order',
  'by',
  'on',
  'and',
  'or',
  'as',
  'limit',
]);

// The nearest preceding clause keyword, ignoring quoted strings. Tells us whether the caret is in a
// table position (after FROM/JOIN) or an expression position (everything else).
export const nearestPrecedingKeyword = (textUpToCaret: string): string | undefined => {
  const withoutStrings = textUpToCaret.replace(/'(?:[^']|'')*'/g, ' ').replace(/--[^\n]*/g, ' ');
  const words = withoutStrings.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i].toLowerCase();
    if (CLAUSE_KEYWORDS.has(word)) {
      return word;
    }
  }
  return undefined;
};

// The datasource referenced by the statement's FROM clause, if any.
export const tableInStatement = (text: string): { schema: string; table: string } | undefined => {
  const match =
    /\bfrom\s+("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*))?/i.exec(text);
  if (!match) {
    return undefined;
  }
  const first = unquote(match[1]);
  return match[2] ? { schema: first, table: unquote(match[2]) } : { schema: 'druid', table: first };
};

export const quoteIfNeeded = (name: string): string =>
  SIMPLE_IDENTIFIER.test(name) ? name : `"${name.replaceAll('"', '""')}"`;

export const unquote = (name: string): string => name.replace(/^"(.*)"$/, '$1').replaceAll('""', '"');

// Only the variables the Go backend actually interpolates (see interpolateVariables
// in pkg/druid.go). Deliberately NOT $__timeFilter & friends — this plugin has no
// SQL macro engine.
export const DRUID_GLOBAL_VARS = [
  {
    id: '$__from',
    text: '$__from',
    type: MacroType.Value,
    args: [],
    description: 'Start of the dashboard time range (Unix ms).',
  },
  {
    id: '$__to',
    text: '$__to',
    type: MacroType.Value,
    args: [],
    description: 'End of the dashboard time range (Unix ms).',
  },
  {
    id: '$__interval',
    text: '$__interval',
    type: MacroType.Value,
    args: [],
    description: 'Suggested interval, e.g. 1m.',
  },
  {
    id: '$__interval_ms',
    text: '$__interval_ms',
    type: MacroType.Value,
    args: [],
    description: 'Suggested interval in ms.',
  },
  { id: '$__range', text: '$__range', type: MacroType.Value, args: [], description: 'Dashboard range as <n>s.' },
  { id: '$__range_s', text: '$__range_s', type: MacroType.Value, args: [], description: 'Dashboard range in seconds.' },
  { id: '$__range_ms', text: '$__range_ms', type: MacroType.Value, args: [], description: 'Dashboard range in ms.' },
  { id: '$__rate_interval', text: '$__rate_interval', type: MacroType.Value, args: [], description: 'Rate interval.' },
];

export function findFunctionDoc(word: string): SqlFunctionDoc | undefined {
  const name = word.toUpperCase();
  const fromCatalog = SQL_FUNCTIONS[name];
  if (fromCatalog) {
    return fromCatalog;
  }
  // Vocabulary Druid does not document (CURRENT_TIME, NULL, ...) still gets a hover.
  const vocabulary = SQL_VOCABULARY_DOCS[name];
  return vocabulary ? { args: '', description: vocabulary } : undefined;
}

// How a name is rendered in hovers: with an argument list only where SQL expects one. Niladic
// functions (CURRENT_TIMESTAMP, PI) and plain vocabulary (NULL, ...) take none, while a zero-argument
// function documented as `ROW_NUMBER()` does.
export function functionSignature(name: string, doc: SqlFunctionDoc): string {
  const upper = name.toUpperCase();
  const takesNoParens = NO_PAREN_FUNCTIONS.has(upper) || SQL_FUNCTIONS[upper] === undefined;
  return takesNoParens ? upper : `${upper}(${doc.args})`;
}

// Split a signature's argument string into top-level parameters. Brackets ([]) are
// Druid's optionality markers and are stripped; parens/angle brackets protect commas.
export function splitArgs(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of args) {
    if (ch === '(' || ch === '<') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === '>') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === '[' || ch === ']') {
      // optionality marker — drop it
    } else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts.filter((p) => p.length > 0);
}

// Given the text up to the cursor, find the innermost enclosing function call and
// the zero-based index of the argument the cursor sits in. Best-effort; ignores
// content inside single/double-quoted strings.
export function findEnclosingCall(textUpToCursor: string): { name: string; argIndex: number } | undefined {
  const stack: Array<{ name: string; argIndex: number }> = [];
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < textUpToCursor.length; i++) {
    const ch = textUpToCursor[i];
    if (inSingle) {
      if (ch === "'") {
        if (textUpToCursor[i + 1] === "'") {
          i++; // escaped ''
        } else {
          inSingle = false;
        }
      }
      continue;
    }
    if (inDouble) {
      if (ch === '"') {
        if (textUpToCursor[i + 1] === '"') {
          i++; // escaped ""
        } else {
          inDouble = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inSingle = true;
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === '(') {
      // read the identifier immediately preceding this '('
      let j = i - 1;
      while (j >= 0 && /\s/.test(textUpToCursor[j])) {
        j--;
      }
      let end = j + 1;
      while (j >= 0 && /[A-Za-z0-9_]/.test(textUpToCursor[j])) {
        j--;
      }
      const name = textUpToCursor.slice(j + 1, end);
      stack.push({ name, argIndex: 0 });
    } else if (ch === ')') {
      stack.pop();
    } else if (ch === ',' && stack.length > 0) {
      stack[stack.length - 1].argIndex++;
    }
  }
  const top = stack[stack.length - 1];
  if (!top || !top.name) {
    return undefined;
  }
  return top;
}

const registeredIds = new Set<string>();

// SQLEditor gives every mounted editor its own Monaco language id, so the datasource is tracked per
// id rather than globally: a panel can hold several SQL queries pointing at different Druid
// datasources (mixed datasource mode), and a single shared variable would serve the wrong schema to
// all but the last-mounted editor. `latestDatasource` only covers ids registered before this map
// existed for that editor (e.g. a datasource swapped without a remount).
const datasourceByLanguageId = new Map<string, DruidDataSource | undefined>();
let latestDatasource: DruidDataSource | undefined;

// Supplements plugin-ui's completion in two ways, both ranged over the partial word so Monaco filters
// by it and replaces it on accept:
//   * always — the Druid keyword/constant/niladic-function vocabulary, which plugin-ui never offers,
//   * mid-statement (partial word with trailing text, the position it mishandles — see the note
//     above) — tables after FROM/JOIN, otherwise the referenced datasource's columns and functions.
function registerMidStatementCompletion(monaco: Monaco, languageId: string): void {
  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: async (model, position) => {
      const line = model.getLineContent(position.lineNumber);
      const prefix = wordPrefixBefore(line, position.column);
      const midStatement = hasTrailingContent(line, position.column);
      // The position plugin-ui mishandles: caret at the end of a partial word with trailing text.
      const brokenPosition = prefix !== '' && midStatement;
      // Ranges the partial word (empty range at the caret when there is none, which is where the word
      // would start) so Monaco filters by what gets typed and replaces it on accept.
      const range = new monaco.Range(
        position.lineNumber,
        position.column - prefix.length,
        position.lineNumber,
        position.column
      );
      const textUpToCaret = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const keyword = nearestPrecedingKeyword(textUpToCaret);
      const kinds = monaco.languages.CompletionItemKind;
      const datasource = datasourceByLanguageId.get(model.getLanguageId()) ?? latestDatasource;

      // Keywords / constants / niladic functions (CURRENT_TIMESTAMP, NULL, GROUP BY, ...).
      const plainWords = PLAIN_WORDS.filter((w) => brokenPosition || !ENGINE_KEYWORDS.has(w.label)).map((w) => ({
        label: w.label,
        kind: w.isKeyword ? kinds.Keyword : kinds.Value,
        insertText: w.label,
        ...(w.documentation
          ? {
              documentation: {
                value: w.fromDruidDocs
                  ? `${w.documentation}\n\n_Docs: Apache Druid ${DRUID_DOCS_VERSION}_`
                  : w.documentation,
              },
            }
          : {}),
        range,
        sortText: `2${w.label}`, // after columns and functions
      }));

      if (keyword === 'from' || keyword === 'join') {
        // A datasource name belongs here, so no keyword/constant noise. plugin-ui resolves tables
        // correctly unless the caret sits in the position it mishandles.
        if (!brokenPosition || !datasource) {
          return { suggestions: [], incomplete: true };
        }
        const tables = await fetchTables(datasource).catch(() => []);
        return {
          incomplete: true,
          suggestions: tables.map((t) => {
            const label = t.schema === 'druid' ? t.name : `${t.schema}.${t.name}`;
            const insertText = t.schema === 'druid' ? quoteIfNeeded(t.name) : `${t.schema}.${quoteIfNeeded(t.name)}`;
            return { label, kind: kinds.Struct, insertText, range, sortText: `0${label}` };
          }),
        };
      }

      if (!brokenPosition) {
        // plugin-ui already supplies columns, tables and functions here — only add the vocabulary.
        // `incomplete` matters: without it Monaco keeps filtering the list it cached when the widget
        // opened (often right after `SELECT `, before any word was typed), so entries that only match
        // a longer prefix — CURRENT_TIMESTAMP after typing `CURR` — would never show up.
        return { suggestions: plainWords, incomplete: true };
      }

      const suggestions: monacoTypes.languages.CompletionItem[] = [];
      const table = tableInStatement(model.getValue());
      if (datasource && table) {
        const columns = await fetchColumns(datasource, table.schema, table.table).catch(() => []);
        suggestions.push(
          ...columns.map((c) => ({
            label: c.name,
            kind: kinds.Field,
            detail: c.type,
            insertText: quoteIfNeeded(c.name),
            range,
            sortText: `0${c.name}`, // columns rank above functions
          }))
        );
      }
      suggestions.push(
        ...Object.entries(SQL_FUNCTIONS)
          .filter(([name]) => !NO_PAREN_FUNCTIONS.has(name)) // those are in plainWords, without parens
          .map(([name, doc]) => ({
            label: name,
            kind: kinds.Function,
            detail: `${name}(${doc.args})`,
            documentation: { value: `${doc.description}\n\n_Docs: Apache Druid ${DRUID_DOCS_VERSION}_` },
            insertText: `${name}($0)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `1${name}`,
          }))
      );
      suggestions.push(...plainWords);
      return { suggestions, incomplete: true };
    },
  });
}

// SQLEditor registers each mounted editor's Monarch language under `druid-sql-<uuid>`,
// so a provider bound to the literal 'druid-sql' never fires. Discover the live ids by
// scanning the models and register once per id (SQLEditor never disposes its own
// providers either — we mirror that and keep the set forever).
export function registerInlineHelpProviders(monaco: Monaco, datasource?: DruidDataSource): void {
  monaco.editor
    .getModels()
    .map((m) => m.getLanguageId())
    .filter((id) => id.startsWith('druid-sql') && !registeredIds.has(id))
    .forEach((id) => {
      registeredIds.add(id);
      datasourceByLanguageId.set(id, datasource);

      registerMidStatementCompletion(monaco, id);

      monaco.languages.registerHoverProvider(id, {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) {
            return null;
          }
          const doc = findFunctionDoc(word.word);
          if (!doc) {
            return null;
          }
          const signature = functionSignature(word.word, doc);
          const contents = [{ value: `**${signature}**` }, { value: doc.description }];
          // Only stamp the docs version on text that actually came from the Druid docs.
          if (SQL_FUNCTIONS[word.word.toUpperCase()]) {
            contents.push({ value: `_Docs: Apache Druid ${DRUID_DOCS_VERSION}_` });
          }
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents,
          };
        },
      });

      monaco.languages.registerSignatureHelpProvider(id, {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: (model, position) => {
          const textUpToCursor = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          const call = findEnclosingCall(textUpToCursor);
          const doc = call && findFunctionDoc(call.name);
          if (!call || !doc) {
            return null;
          }
          const params = splitArgs(doc.args);
          return {
            value: {
              signatures: [
                {
                  label: `${call.name.toUpperCase()}(${doc.args})`,
                  documentation: { value: doc.description },
                  parameters: params.map((p) => ({ label: p })),
                },
              ],
              activeSignature: 0,
              activeParameter: Math.min(call.argIndex, Math.max(params.length - 1, 0)),
            },
            dispose: () => {},
          };
        },
      });
    });
}

export const getDruidSqlCompletionProvider =
  (datasource?: DruidDataSource): LanguageCompletionProvider =>
  (monaco, language) => {
    latestDatasource = datasource;
    registerInlineHelpProviders(monaco, datasource);

    return {
      ...(language && getStandardSQLCompletionProvider(monaco, language)),
      supportedFunctions: () =>
        // The engine always inserts `NAME($0)`, so niladic functions are excluded here and offered by
        // registerMidStatementCompletion as plain text instead.
        Object.entries(SQL_FUNCTIONS)
          .filter(([name]) => !NO_PAREN_FUNCTIONS.has(name))
          .map(([name, doc]) => ({
            id: name,
            name,
            description: `${name}(${doc.args})\n\n${doc.description}`,
          })),
      supportedMacros: () => DRUID_GLOBAL_VARS,
      tables: {
        resolve: async () => {
          if (!datasource) {
            return [];
          }
          const tables = await fetchTables(datasource).catch(() => []);
          // druid-schema tables by bare name; other schemas fully qualified
          return tables.map((t) => {
            const name = t.schema === 'druid' ? t.name : `${t.schema}.${t.name}`;
            const completion = t.schema === 'druid' ? quoteIfNeeded(t.name) : `${t.schema}.${quoteIfNeeded(t.name)}`;
            return { name, completion };
          });
        },
      },
      columns: {
        resolve: async (identifier) => {
          if (!datasource || !identifier?.table) {
            return [];
          }
          // identifier may arrive as {table:'wikipedia'}, {schema:'sys', table:'segments'},
          // or with a dotted/quoted table name — normalize defensively.
          let schema = identifier.schema ?? 'druid';
          let table = unquote(identifier.table);
          if (table.includes('.')) {
            const [s, t] = table.split('.', 2);
            schema = s;
            table = unquote(t);
          }
          const columns = await fetchColumns(datasource, schema, table).catch(() => []);
          return columns.map((c) => ({ name: c.name, type: c.type, description: c.type }));
        },
      },
    };
  };
