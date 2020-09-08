import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class RegisteredLookup extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'type',
      'dimension',
      'outputName',
      'name',
      'retainMissingValue',
      'replaceMissingValueWith',
      'optimize',
    ]);
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
            <FormField
              label="Dimension"
              name="dimension"
              type="text"
              placeholder="the dimension name"
              value={builder.dimension}
              onChange={this.onInputChange}
            />
            <FormField
              label="Output name"
              name="outputName"
              type="text"
              placeholder="the, optionnal, dimension output name"
              value={builder.outputName}
              onChange={this.onInputChange}
            />
            <FormField
              label="Name"
              name="name"
              type="text"
              placeholder="the lookup name"
              value={builder.name}
              onChange={this.onInputChange}
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
