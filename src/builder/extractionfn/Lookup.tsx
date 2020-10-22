import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { Map } from '../lookup';

const { FormField } = LegacyForms;

export class Lookup extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'lookup', 'retainMissingValue', 'replaceMissingValueWith', 'injective', 'optimize']);
    const { builder } = props.options;
    builder.type = 'lookup';
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    let value: any = event.target.value;
    if ('number' === event.target.type) {
      value = Number(value);
    }
    builder[event.target.name] = value;
    onOptionsChange({ ...options, builder: builder });
  };

  onCheckboxChange = (component: string, event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
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
              width: 300px;
            `}
          >
            <Map
              options={this.builderOptions('lookup')}
              onOptionsChange={this.onOptionsChange.bind(this, 'lookup')}
            />
            <Checkbox
              value={builder.retainMissingValue}
              onChange={this.onCheckboxChange.bind(this, 'retainMissingValue')}
              label="Retain missing value"
              description="Specifies if the missing value should be retained."
            />
            <FormField
              label="Replace missing value with"
              name="replaceMissingValueWith"
              type="text"
              placeholder="the missing value replacement text"
              value={builder.replaceMissingValueWith}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.injective}
              onChange={this.onCheckboxChange.bind(this, 'injective')}
              label="Injective"
              description="Specifies if the lookup is injective."
            />
            <Checkbox
              value={builder.optimize}
              onChange={this.onCheckboxChange.bind(this, 'optimize')}
              label="Optimize"
              description="Specifies if the lookup should be optimized."
            />
          </div>
        </div>
      </>
    );
  }
}
