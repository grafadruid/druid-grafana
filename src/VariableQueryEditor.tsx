import React, { useState, useEffect, useRef } from 'react';
import { ToolbarButtonRow, ToolbarButton, Drawer } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import { DruidQuery } from './types';
import { DruidQuerySettings } from './configuration/QuerySettings';
import { QuerySettingsOptions } from './configuration/QuerySettings/types';
import { DruidQueryBuilder } from './builder/';
import { QueryBuilderOptions } from './builder/types';

interface Props {
  query: DruidQuery;
  onChange: (query: DruidQuery, definition: string) => void;
  /** Passed by Grafana when rendering the variable query editor; required for datasource/metric/dimension/dimension value autocomplete */
  datasource?: any;
  /** Optional time range for dimension value autocomplete (e.g. last 7 days); when missing, suggestions may be limited */
  range?: { from: { valueOf(): number }; to: { valueOf(): number } };
}

function applyIntervalsDefault(queryBuilderOptions: QueryBuilderOptions): QueryBuilderOptions {
  if (
    queryBuilderOptions.builder !== null &&
    (queryBuilderOptions.builder.intervals === undefined ||
      (Array.isArray(queryBuilderOptions.builder.intervals?.intervals) &&
        queryBuilderOptions.builder.intervals.intervals.length === 0))
  ) {
    return {
      ...queryBuilderOptions,
      builder: {
        ...queryBuilderOptions.builder,
        intervals: {
          type: 'intervals',
          intervals: ['${__from:date:iso}/${__to:date:iso}'],
        },
      },
    };
  }
  return queryBuilderOptions;
}

function buildQueryAndExpr(
  propsQuery: DruidQuery,
  options: QueryBuilderOptions
): { query: DruidQuery; expr: string } {
  const opts = applyIntervalsDefault(options);
  const expr = JSON.stringify(opts);
  const query = { ...propsQuery, ...opts, expr };
  return { query, expr };
}

function isSql(b: unknown): boolean {
  return b != null && typeof b === 'object' && (b as { queryType?: string }).queryType === 'sql';
}

export const VariableQueryEditor = (props: Props) => {
  const { query: propsQuery, onChange } = props;
  const { builder, settings } = propsQuery;
  // SQL: keep edits local until blur / Run query / unmount so Grafana does not run metricFindQuery on every keystroke.
  const [localOptions, setLocalOptions] = useState<QueryBuilderOptions>(() => ({
    builder: builder || {},
    settings: settings || {},
  }));
  const settingsOptions = { settings: localOptions.settings || {} };
  const datasource = props.datasource ?? (props as any).datasource;
  const range = props.range ?? (props as any).range;

  const localOptionsRef = useRef(localOptions);
  const propsQueryRef = useRef(propsQuery);
  const onChangeRef = useRef(onChange);
  localOptionsRef.current = localOptions;
  propsQueryRef.current = propsQuery;
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalOptions({
      builder: builder || {},
      settings: settings || {},
    });
  }, [builder, settings]);

  useEffect(() => {
    return () => {
      const opts = localOptionsRef.current;
      if (isSql(opts.builder)) {
        const { query, expr } = buildQueryAndExpr(propsQueryRef.current, opts);
        onChangeRef.current(query, expr);
      }
    };
  }, []);

  const commitSqlToGrafana = () => {
    if (!isSql(localOptions.builder)) return;
    const { query, expr } = buildQueryAndExpr(propsQuery, localOptions);
    onChange(query, expr);
  };

  const onBuilderOptionsChange = (queryBuilderOptions: QueryBuilderOptions) => {
    const opts = applyIntervalsDefault(queryBuilderOptions);
    if (isSql(opts.builder)) {
      setLocalOptions(opts);
    } else {
      const { query, expr } = buildQueryAndExpr(propsQuery, opts);
      onChange(query, expr);
    }
  };

  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const nextOptions = { builder: localOptions.builder, ...querySettingsOptions };
    setLocalOptions(nextOptions);
    const { query, expr } = buildQueryAndExpr(propsQuery, nextOptions);
    onChange(query, expr);
  };

  const [showDrawer, setShowDrawer] = useState(false);
  const useLocalStateForBuilder = isSql(builder) || isSql(localOptions.builder);
  const builderOptions = useLocalStateForBuilder
    ? { builder: localOptions.builder || {}, settings: localOptions.settings || {} }
    : { builder: builder || {}, settings: settings || {} };

  return (
    <>
      <ToolbarButtonRow className={cx(styles.toolbar)}>
        <ToolbarButton
          icon="cog"
          onClick={(event) => {
            setShowDrawer(true);
            event.preventDefault();
          }}
        >
          Query settings
        </ToolbarButton>
      </ToolbarButtonRow>
      {showDrawer && (
        <Drawer
          title="Settings"
          subtitle="The settings to attach to the query. Those settings will be merged with the ones defined at datasource level."
          closeOnMaskClick={true}
          scrollableContent={true}
          size="md"
          onClose={() => {
            setShowDrawer(false);
          }}
        >
          <DruidQuerySettings options={settingsOptions} onOptionsChange={onSettingsOptionsChange} />
        </Drawer>
      )}
      <div onBlur={commitSqlToGrafana}>
        <DruidQueryBuilder
          options={builderOptions}
          onOptionsChange={onBuilderOptionsChange}
          datasource={datasource}
          rootBuilder={builderOptions.builder}
          range={range}
        />
      </div>
    </>
  );
};

const styles = {
  toolbar: css`
    margin-bottom: 4px;
  `,
};
