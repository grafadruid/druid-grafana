import type { monacoTypes } from '@grafana/ui';
import { format } from 'sql-formatter';
import {
  type LanguageDefinition,
  type SQLMonarchLanguage,
  grafanaStandardSQLLanguage,
  grafanaStandardSQLLanguageConf,
} from '@grafana/plugin-ui';
import { DruidDataSource } from '../../../DruidDataSource';
import { SQL_FUNCTIONS } from './druidSqlDocs';
import { SQL_KEYWORDS, SQL_CONSTANTS, SQL_DYNAMICS } from './keywords';
import { getDruidSqlCompletionProvider } from './completionProvider';

// The Monarch tokenizer chokes on multi-word entries, so split them into words.
const tokenizerKeywords = [...SQL_KEYWORDS.flatMap((k) => k.split(' ')), ...SQL_CONSTANTS, ...SQL_DYNAMICS];

// Reuse Grafana's standard SQL Monarch tokenizer (comments, strings with '' escape,
// double-quoted identifiers, numbers, keywords, functions) and only swap in the
// Druid-specific vocabulary that drives highlighting and standard completion.
export const druidSqlLanguage: SQLMonarchLanguage = {
  ...grafanaStandardSQLLanguage,
  id: 'druid-sql',
  keywords: tokenizerKeywords,
  builtinFunctions: Object.keys(SQL_FUNCTIONS),
  logicalOperators: ['AND', 'OR', 'NOT', 'LIKE', 'BETWEEN', 'IN', 'IS', 'ANY', 'ALL', 'SOME', 'EXISTS'],
  comparisonOperators: ['=', '<>', '!=', '<', '>', '<=', '>='],
  operators: ['+', '-', '*', '/', '||'],
};

export const druidSqlLanguageConf: monacoTypes.languages.LanguageConfiguration = grafanaStandardSQLLanguageConf;

// Grafana template variables in every syntax the plugin supports: `$var`, `$__from`,
// `${var}`, `${var:format}` and `[[var]]`. sql-formatter must treat them as opaque tokens —
// otherwise it fails to parse the query (`$__from` is not valid SQL), and clicking "Format query" on
// the canonical Druid time filter would silently do nothing.
const GRAFANA_VARIABLE = String.raw`\$\{[^}]*\}|\$__?[a-zA-Z0-9_:]+|\[\[[^\]]*\]\]`;

// sql-formatter does not know Druid's functions, so it renders an unknown `NAME(` as `NAME (`.
// Druid accepts that, but it is unlike every Druid example, so the space is removed again — only
// after names that are not SQL keywords, to keep `IN (`, `VALUES (` and friends intact.
const KEYWORD_HEADS = new Set(SQL_KEYWORDS.flatMap((k) => k.split(' ')));
const collapseCallParens = (sql: string): string =>
  sql.replace(/\b([A-Za-z_][A-Za-z0-9_]*) \(/g, (match, name) =>
    KEYWORD_HEADS.has(name.toUpperCase()) ? match : `${name}(`
  );

// Backs the "Format query" button and Monaco's format-document action (SQLEditor registers a
// formatting provider whenever the language definition has a formatter). Druid SQL is Calcite-based,
// so the generic 'sql' dialect is the closest fit. A half-written query must never throw or be
// mangled, hence the pass-through on error.
export const formatDruidSql = (query: string): string => {
  try {
    return collapseCallParens(
      format(query, {
        language: 'sql',
        keywordCase: 'upper',
        paramTypes: { custom: [{ regex: GRAFANA_VARIABLE }] },
      })
    );
  } catch {
    return query;
  }
};

export const getDruidSqlLanguageDefinition = (datasource?: DruidDataSource): LanguageDefinition => ({
  id: 'druid-sql',
  loader: () => Promise.resolve({ language: druidSqlLanguage, conf: druidSqlLanguageConf }),
  completionProvider: getDruidSqlCompletionProvider(datasource),
  formatter: formatDruidSql,
});
