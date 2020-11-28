import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';

export class DatasourceMetadata extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['queryType', 'dataSource']);
    const { builder } = props.options;
    builder.queryType = 'dataSourceMetadata';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  onOptionsChange = (component: string, componentBuilderOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = componentBuilderOptions.builder;
    onOptionsChange({ ...options, builder, settings });
  };

  builderOptions = (component: string): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder[component] || {}, settings: settings || {} };
  };

  render() {
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <DataSource
              options={this.builderOptions('dataSource')}
              onOptionsChange={this.onOptionsChange.bind(this, 'dataSource')}
            />
          </div>
        </div>
      </>
    );
  }
}
