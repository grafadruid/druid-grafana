// Type declarations for the CommonJS parser shared by the generator and jest tests.

export interface ParsedFunction {
  name: string;
  args: string;
  description: string;
}

export interface ParsedDataType {
  name: string;
  runtime: string;
  description: string;
}

export interface ParsedDruidSqlDocs {
  functions: Record<string, { args: string; description: string }>;
  dataTypes: Record<string, { runtime: string; description: string }>;
}

export function hasHtmlTags(str: string): boolean;
export function sanitizeArguments(str: string): string;
export function cleanDescription(markdown: string): string;
export function parseFunctionRow(line: string): ParsedFunction | null;
export function parseDataTypeRow(line: string): ParsedDataType | null;
export function parseNiladicRow(line: string): ParsedFunction | null;
export function parseDruidSqlDocs(markdown: string): ParsedDruidSqlDocs;
