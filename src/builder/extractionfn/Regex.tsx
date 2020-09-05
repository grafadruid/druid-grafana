import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Regex extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'expr', 'index', 'replaceMissingValue', 'replaceMissingValueWith']);
    const { builder } = props.options;
    builder.type = 'regex';
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

  onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.replaceMissingValue = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 500px;
            `}
          >
            <FormField
              label="Expression"
              name="expr"
              type="text"
              placeholder="the regular expression"
              value={builder.expr}
              onChange={this.onInputChange}
            />
            <FormField
              label="Index"
              name="index"
              type="number"
              placeholder="the index"
              value={builder.index}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.replaceMissingValue}
              onChange={this.onCheckboxChange}
              label="Replace missing value"
              description="Specifies if the missing value should be replaced."
            />
            <FormField
              label="Replace missing value with"
              name="replaceMissingValueWith"
              type="text"
              placeholder="the missing value replacement"
              value={builder.replaceMissingValueWith}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
