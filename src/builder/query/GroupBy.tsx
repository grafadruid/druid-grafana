import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Dimension } from '../dimension';

export class GroupBy extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);

    const { builder } = props.options;
    builder.queryType = 'groupBy';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
  }

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
            <Dimension
              options={this.builderOptions('dimensions')}
              onOptionsChange={this.onOptionsChange.bind(this, 'dimensions')}
            />
          </div>
        </div>
      </>
    );
  }
}
