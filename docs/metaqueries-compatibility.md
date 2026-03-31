# Metaqueries plugin compatibility: structure comparison

This document compares the **grafadruid** (this plugin) response shape with what the **grafana-meta-queries** plugin expects when it calls `datasourceSrv.get(dsName).then(ds => ds.query(opt))`. The metaqueries plugin was read from `/goshposh/grafana-meta-queries` (dist/datasource.js).

---

## What metaqueries expects

The plugin **always** consumes the upstream result as `result.data`: an array of series. Each item is a **datum** that it uses in two ways.

### Top-level: `result.data`

- Metaqueries flattens upstream results and exposes **`result.data`** (array of series).
- It never reads `result.frames`.
- Code: lines 132–141 (flatten `results` and return `{ data: _.flatten(...) }`); lines 239, 334, 381 (it uses `result.data` / `data = result.data`).

### Per-datum: legacy vs “DataFrame” path

For each `datum` in `result.data`, metaqueries supports:

1. **Legacy series**
   - `datum.target` or `datum.name` (metric/series name).
   - `datum.datapoints`: array of `[value, timestamp]` (value first, timestamp in ms).

2. **“DataFrame” path** (what it treats as the new format)
   - `datum.fields`: array of **frontend Field objects**.
   - `datum.fields[0]`: time field (metaqueries uses it as timestamp).
   - `datum.fields[1]`: value field.
   - Each field has:
     - **`.values.length`** (number of rows).
     - **`.values.get(i)`** (value at index `i`).
   - So it expects the **frontend Field/Vector API** (e.g. `ArrayVector` with `.get(i)`), not raw column arrays.

Used in:

- **Moving Average** (256–266): `datum.datapoints` or `datum.fields` with `datum.fields[0].values.length` and `datum.fields[1].values.get(i)`, `datum.fields[0].values.get(i)`.
- **Time Shift** (339–345): same; DataFrame path uses `dataframe_to_datapoints(datum.fields, ...)` which again uses `fields[0].values.length` and `fields[0].values.get(i)`, `fields[1].values.get(i)` (426–431).
- **Arithmetic** (386–402): `resultByQueryMetric.datapoints` or `resultByQueryMetric.fields` with `resultByQueryMetric.name` and `fields[0].values.length` / `fields[1].values.get(k)`, `fields[0].values.get(k)`.
- **filter_datapoints** (352–363): for “new dataframe format” it uses `root_query_results['data'][0]['fields'][0].values.get(0)` for `actualFrom`.

### Metric/series name

- Metaqueries uses **`datum.target`** or **`datum.name`** to identify the series (e.g. matching `target.metric`, or as `metricName` in arithmetic).
- Moving Average / Time Shift: `datum.target === metric || datum.name == metric` (241, 336).
- Arithmetic: `metricName = resultByQueryMetric.target` or `resultByQueryMetric.name` when using fields (393, 394).

---

## What grafadruid returns (backend → frontend)

Grafadruid is a **backend** datasource. Its Go backend returns a **QueryDataResponse** with **Frames** only (no legacy `data` array).

### Backend (this repo, `pkg/druid.go`)

- **Top-level:** `response.Frames = append(response.Frames, frame)` (line 1771). So the response is **frame-based**, not `result.data`.
- **Per-frame:** One `data.NewFrame(resp.Reference)` with:
  - **`frame.Fields`**: each `data.NewField(c.Name, nil, ff)` where `ff` is a **Go slice** (e.g. `[]float64`, `[]time.Time`) — column arrays, not frontend Field objects.
- **Name:** The frame has a **RefID** (e.g. `"A"`); column names are in `frame.Fields[ic].Name` (e.g. `"timestamp"`, metric name). There is no `target` or `name` on the series in the legacy sense; the “series name” can be the frame name or a field name depending on format (long vs wide).

When this is sent to the frontend, Grafana typically:

- Serializes Frames (e.g. Arrow) and deserializes on the frontend.
- Exposes the result to other code (e.g. panels, other datasources) in the **SDK/frontend** shape. That can be:
  - **`result.frames`**: array of frame objects with **`frame.schema.fields`** (metadata) and **`frame.data.values`** or similar (column arrays), and/or
  - A normalized view where frames are converted to a form that has **`result.data`** with items that have **`fields`** with the frontend **Vector** API (`.values.length`, `.values.get(i)`).

So there are two possibilities on the frontend:

- If the runtime leaves the response as **raw frames**: metaqueries sees **`result.frames`** and **never** sees `result.data`, so its code path that expects `result.data` is never used.
- If the runtime converts frames to the **legacy-style** `result.data` with **frontend DataFrame** (Field with Vector API), then:
  - Top-level: `result.data` ✅
  - Per-datum: `datum.fields[0/1].values.length` and `.values.get(i)` ✅ only if those are real frontend Field/Vector objects.
  - Metric name: metaqueries expects `datum.target` or `datum.name`; grafadruid’s frame has **schema/name** (e.g. RefID `"A"`) and field names, which may or may not be mapped to `datum.name` / `datum.target` depending on Grafana’s conversion.

---

## Structure mismatch summary

| Aspect | Metaqueries expects | Grafadruid (backend) returns |
|--------|---------------------|------------------------------|
| **Top-level** | `result.data` (array of series) | `result.frames` (array of frames). No `result.data` unless Grafana converts frames → data. |
| **Per-series** | `datum.fields[0].values.length`, `datum.fields[j].values.get(i)` (frontend Field/Vector API) | Frame has column-oriented data: `frame.Fields` with Go slices. On frontend often `frame.schema.fields` (metadata) and `frame.data.values` (column arrays), not necessarily the same object shape or Vector API. |
| **Metric name** | `datum.target` or `datum.name` | Frame has `schema.name` (e.g. RefID `"A"`) and field names; no `target`/`name` unless added by conversion. |

So:

1. **Top-level:** Grafadruid uses **`result.frames`**; metaqueries expects **`result.data`**. Unless Grafana’s runtime converts frames into `result.data`, metaqueries will not see any series from grafadruid.
2. **Per-series:** Grafadruid’s frontend representation uses **`frame.schema.fields`** (metadata) and **`frame.data.values`** (column arrays). Metaqueries expects **`datum.fields[0].values`** to have **`.length`** and **`.get(i)`** (frontend Vector API). If the object is plain arrays or a different API, metaqueries will break when it calls `.values.get(i)`.
3. **Metric name:** Grafadruid has **schema.name** (e.g. `"A"`); metaqueries expects **`datum.target`** or **`datum.name`**. These may not be the same unless the frame→series conversion sets them.

---

## Conclusion

- **Metaqueries** is written against the **old** contract: `result.data` and either legacy `datapoints` or frontend **DataFrame** with **Field.values** implementing the Vector API (`.length`, `.get(i)`), plus `datum.target` / `datum.name`.
- **Grafadruid** returns **backend Frames** (frame-based, column arrays, RefID/schema names). Whether that becomes compatible with metaqueries depends entirely on **how Grafana converts** backend Frames to the object that metaqueries receives when it calls `ds.query(opt)`:
  - If conversion produces **`result.data`** with **`datum.fields`** (Vector API) and **`datum.name`**/`datum.target`**, then metaqueries can work.
  - If the response stays as **`result.frames`** with **`frame.schema`** / **`frame.data.values`** and no `result.data`, then metaqueries will not work with grafadruid without changes (either in Grafana’s conversion, in metaqueries to support `result.frames` and the frame shape, or in grafadruid to also emit a legacy-compatible `result.data` when used from the frontend).

This file summarizes the structure comparison and the three mismatches you called out (top-level, per-series, metric name).

---

## Implementation: Making grafadruid compatible

To make this plugin work with the metaqueries plugin, the following was added in this repo:

### 1. `src/metaqueriesCompat.ts`

- **`ensureMetaqueriesCompatibleResponse(response)`**  
  Takes the backend/frontend query response and returns a new response that:
  - Sets **`response.data`** from **`response.data`** or **`response.frames`** so metaqueries always sees `result.data`.
  - Converts each frame into one or more series objects (one per value column in wide format).
  - For each series object it ensures:
    - **`target`** and **`name`** (from frame name, refId, or value field name).
    - **`datapoints`**: `[[value, timestamp], ...]` for the legacy path (Moving Average, Time Shift, Arithmetic, filter_datapoints).
    - **`fields`**: time and value field(s) with **`values`** wrapped so they have **`.length`** and **`.get(i)`** (Vector API for metaqueries’ DataFrame path).

- Time vs value columns are detected by **field type** (`FieldType.time`) or **name** (`time`, `timestamp`). All other fields are treated as value columns (wide format → one series per value column).

### 2. `src/DruidDataSource.ts`

- **`query(options)`** is overridden to run the backend query and then transform the result:
  - Calls **`super.query(options).pipe(map(ensureMetaqueriesCompatibleResponse))`** so every emitted response is in the metaqueries-compatible shape above.

With this in place, when the metaqueries plugin calls `datasourceSrv.get(druidDs).then(ds => ds.query(opt))`, it receives **`result.data`** with each datum having **`target`**, **`name`**, **`datapoints`**, and (when applicable) **`fields`** with Vector-like **`.values.get(i)`**, so both legacy and DataFrame paths in metaqueries work.
