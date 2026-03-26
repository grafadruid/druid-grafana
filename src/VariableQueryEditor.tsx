import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ToolbarButtonRow, ToolbarButton, Drawer } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import { debounce } from 'lodash';
import { DruidQuery } from './types';
import { DruidQuerySettings } from './configuration/QuerySettings';
import { QuerySettingsOptions } from './configuration/QuerySettings/types';
import { DruidQueryBuilder } from './builder/';
import { QueryBuilderOptions } from './builder/types';

/** Delay before committing SQL variable query to Grafana (avoids running metricFindQuery on every keystroke). */
const VARIABLE_SQL_DEBOUNCE_MS = 1000;

interface Props {
  query: DruidQuery;
  onChange: (query: DruidQuery, definition: string) => void;
  /** Passed by Grafana when rendering the variable query editor; required for datasource/metric/dimension/dimension value autocomplete */
  datasource?: any;
  /** Optional time range for dimension value autocomplete (e.g. last 7 days); when missing, suggestions may be limited */
  range?: { from: { valueOf(): number }; to: { valueOf(): number } };
}

function isSql(b: unknown): boolean {
  return b != null && typeof b === 'object' && (b as { queryType?: string }).queryType === 'sql';
}

export const VariableQueryEditor = (props: Props) => {
  const { builder, settings } = props.query;
  const builderOptions = { builder: builder || {}, settings: settings || {} };
  const settingsOptions = { settings: settings || {} };
  const datasource = props.datasource ?? (props as any).datasource;
  const range = props.range ?? (props as any).range;

  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  const debouncedSqlOnChange = useMemo(
    () =>
      debounce((nextQuery: DruidQuery, definition: string) => {
        onChangeRef.current(nextQuery, definition);
      }, VARIABLE_SQL_DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSqlOnChange.flush();
      debouncedSqlOnChange.cancel();
    };
  }, [debouncedSqlOnChange]);

  const onBuilderOptionsChange = (queryBuilderOptions: QueryBuilderOptions) => {
    const { query, onChange } = props;
    if (
      queryBuilderOptions.builder !== null &&
      (queryBuilderOptions.builder.intervals === undefined ||
        (Array.isArray(queryBuilderOptions.builder.intervals?.intervals) &&
          queryBuilderOptions.builder.intervals.intervals.length === 0))
    ) {
      queryBuilderOptions.builder.intervals = {
        type: 'intervals',
        intervals: ['${__from:date:iso}/${__to:date:iso}'],
      };
    }
    const expr = JSON.stringify(queryBuilderOptions);
    const nextQuery = { ...query, ...queryBuilderOptions, expr };

    if (isSql(queryBuilderOptions.builder)) {
      debouncedSqlOnChange(nextQuery, expr);
    } else {
      onChange(nextQuery, expr);
    }
  };

  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { query, onChange } = props;
    const expr = JSON.stringify({ builder: query.builder, ...querySettingsOptions });
    onChange({ ...query, ...querySettingsOptions, expr: expr }, expr);
  };

  const [showDrawer, setShowDrawer] = useState(false);

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
      <div onBlur={() => debouncedSqlOnChange.flush()}>
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
