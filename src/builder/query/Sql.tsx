import React, { PureComponent, FormEvent, ChangeEvent } from 'react';
import { css } from 'emotion';
import { TextArea } from '@grafana/ui';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';

export class Sql extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['queryType', 'query']);
    const { builder } = props.options;
    builder.queryType = 'sql';
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  onInputChange = (event: FormEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[event.currentTarget.name] = event.currentTarget.value;
    onOptionsChange({ ...options, builder: builder });
  };

  onOptionsChange = (component: string, componentBuilderOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = componentBuilderOptions.builder;
    onOptionsChange({ ...options, builder, settings });
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <label className="gf-form-label">SQL query</label>
            <TextArea
              name="query"
              placeholder="The SQL query. e.g: SELECT * FROM table"
              value={builder.query}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
