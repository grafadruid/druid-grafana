import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DruidDataSource } from './DruidDataSource';
import { DruidDefaultQuery, DruidSettings, DruidQuery } from './types';

const { FormField } = LegacyForms;

interface Props extends QueryEditorProps<DruidDataSource, DruidQuery, DruidSettings> {}

export class QueryEditor extends PureComponent<Props> {
  onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: event.target.value });
  };

  onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, constant: parseFloat(event.target.value) });
    // executes the query
    onRunQuery();
  };

  render() {
    const query = defaults(this.props.query, DruidDefaultQuery);
    const { queryText, constant } = query;

    return (
      <div className="gf-form">
        <FormField
          width={4}
          value={constant}
          onChange={this.onConstantChange}
          label="Constant"
          type="number"
          step="0.1"
        />
        <FormField
          labelWidth={8}
          value={queryText || ''}
          onChange={this.onQueryTextChange}
          label="Query Text"
          tooltip="Not used yet"
        />
      </div>
    );
  }
}
