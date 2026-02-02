export interface QueryBuilderOptions {
  builder: any;
  settings: any;
}

export interface QueryBuilderProps {
  options: QueryBuilderOptions;
  onOptionsChange: (options: QueryBuilderOptions) => void;
  datasource?: any;
  rootBuilder?: any;
  /** Panel time range (e.g. "Last 6 hours") - only used by dimension value auto-suggest; other components ignore it */
  range?: { from: { valueOf(): number }; to: { valueOf(): number } };
}
