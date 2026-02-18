/**
 * Ensures query response shape is compatible with the grafana-meta-queries plugin.
 * Metaqueries expects result.data (not result.frames), each datum with target/name and
 * either datapoints (legacy) or fields[].values with .length and .get(i) (Vector API).
 */

import { FieldType } from '@grafana/data';

const TIME_FIELD_NAMES = ['time', 'timestamp', 'Time', 'Timestamp'];
const TIME_FIELD_TYPE = FieldType?.time ?? 2;

type FieldLike = {
  name: string;
  type?: number;
  values: unknown[] | { length: number; get(i: number): unknown };
};

type FrameLike = {
  name?: string;
  refId?: string;
  fields?: FieldLike[];
  length?: number;
};

/**
 * Get value at index i from field.values (array or Vector with .get(i)).
 */
function getFieldValue(field: FieldLike, i: number): unknown {
  const v = field.values;
  if (v != null && typeof (v as { get?: (i: number) => unknown }).get === 'function') {
    return (v as { get(i: number): unknown }).get(i);
  }
  if (Array.isArray(v)) {
    return v[i];
  }
  return undefined;
}

function getFieldLength(field: FieldLike): number {
  const v = field.values;
  if (v != null && typeof v === 'object' && 'length' in v) {
    return (v as { length: number }).length;
  }
  if (Array.isArray(v)) {
    return v.length;
  }
  return 0;
}

/**
 * Ensure field.values has .length and .get(i) for metaqueries DataFrame path.
 * If values is a plain array, wrap it in a Vector-like object.
 */
function ensureVectorLike(values: unknown): { length: number; get(i: number): unknown } {
  if (values != null && typeof (values as { get?: (i: number) => unknown }).get === 'function') {
    return values as { length: number; get(i: number): unknown };
  }
  const arr = Array.isArray(values) ? values : [];
  return {
    get length() {
      return arr.length;
    },
    get(i: number): unknown {
      return arr[i];
    },
  };
}

/**
 * Find time field index and all value field indices in a frame.
 * Returns timeIdx and array of value indices (for wide format: one series per value column).
 */
function findTimeAndValueFieldIndices(
  frame: FrameLike
): { timeIdx: number; valueIndices: number[] } | null {
  const fields = frame.fields;
  if (!fields || fields.length < 2) {
    return null;
  }
  let timeIdx = -1;
  const valueIndices: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const name = (f.name || '').toLowerCase();
    const isTime =
      f.type === TIME_FIELD_TYPE ||
      TIME_FIELD_NAMES.some((t) => name === t.toLowerCase());
    if (isTime && timeIdx < 0) {
      timeIdx = i;
    } else {
      valueIndices.push(i);
    }
  }
  if (timeIdx < 0 || valueIndices.length === 0) {
    return null;
  }
  return { timeIdx, valueIndices };
}

/**
 * Convert a single frame to one or more series objects that metaqueries accepts.
 * Wide format (one time + multiple value columns) yields one datum per value column.
 */
function frameToMetaqueriesData(frame: FrameLike): Record<string, unknown>[] {
  const indices = findTimeAndValueFieldIndices(frame);
  const fields = frame.fields || [];
  const len = frame.length ?? (fields[0] ? getFieldLength(fields[0]) : 0);
  const targetLabel = frame.refId ?? frame.name ?? 'series';

  if (!indices || len === 0) {
    const datum: Record<string, unknown> = {
      target: targetLabel,
      name: frame.name ?? frame.refId ?? 'series',
      datapoints: [],
      refId: frame.refId,
      length: 0,
    };
    if (fields.length > 0) {
      datum.fields = fields.map((f) => ({ ...f, values: ensureVectorLike(f.values) }));
    }
    return [datum];
  }

  const { timeIdx, valueIndices } = indices;
  const timeField = fields[timeIdx];
  const datums: Record<string, unknown>[] = [];

  for (const valueIdx of valueIndices) {
    const valueField = fields[valueIdx];
    const seriesName = valueField.name ?? frame.name ?? frame.refId ?? 'series';
    const datapoints: [number, number][] = [];
    for (let i = 0; i < len; i++) {
      const t = getFieldValue(timeField, i);
      const v = getFieldValue(valueField, i);
      const ts = typeof t === 'number' ? t : t instanceof Date ? t.getTime() : Number(t);
      const val = typeof v === 'number' ? v : Number(v);
      if (!Number.isNaN(ts) && !Number.isNaN(val)) {
        datapoints.push([val, ts]);
      }
    }
    const datum: Record<string, unknown> = {
      target: targetLabel,
      name: seriesName,
      datapoints,
      refId: frame.refId,
      length: datapoints.length,
    };
    datum.fields = [
      { ...timeField, values: ensureVectorLike(timeField.values) },
      { ...valueField, values: ensureVectorLike(valueField.values) },
    ];
    datums.push(datum);
  }

  return datums;
}

/**
 * Transform backend/frontend response so it has result.data in a shape metaqueries expects.
 * - Ensures response.data exists (copy from response.frames if needed).
 * - Each item in data gets target, name, and datapoints; keeps fields for DataFrame path.
 */
export function ensureMetaqueriesCompatibleResponse(response: {
  data?: unknown[];
  frames?: unknown[];
  [key: string]: unknown;
}): { data: unknown[]; [key: string]: unknown } {
  const rawData = response.data ?? response.frames ?? [];
  const frames = Array.isArray(rawData) ? rawData : [];

  const data = frames.flatMap((f) => frameToMetaqueriesData(f as FrameLike));
  return { ...response, data };
}
