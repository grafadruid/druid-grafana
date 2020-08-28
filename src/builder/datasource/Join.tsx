import React, { PureComponent, FormEvent, ChangeEvent } from 'react';
import { TextArea, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';

const { FormField } = LegacyForms;

export class Join extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'left', 'right', 'rightPrefix', 'condition', 'joinType']);
    const { builder } = props.options;
    builder.type = 'join';
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

  builderOptions = (component: string): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder[component] || {}, settings: settings || {} };
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 250px;
            `}
          >
            <label className="gf-form-label">Left datasource</label>
            <DataSource
              options={this.builderOptions('left')}
              onOptionsChange={this.onOptionsChange.bind(this, 'left')}
            />
            <label className="gf-form-label">Right datasource</label>
            <DataSource
              options={this.builderOptions('right')}
              onOptionsChange={this.onOptionsChange.bind(this, 'right')}
            />
            <FormField
              label="Right prefix"
              name="rightPrefix"
              type="text"
              placeholder="the right datasource prefix"
              value={builder.rightPrefix}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Condition</label>
            <TextArea
              name="condition"
              placeholder="the join condition expression"
              value={builder.condition}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
