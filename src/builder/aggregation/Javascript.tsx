import React, { PureComponent, FormEvent, ChangeEvent } from 'react';
import { MultiSelect, TextArea, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Javascript extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'name', 'fieldNames', 'fnAggregate', 'fnCombine', 'fnReset']);
    const { builder } = props.options;
    builder.type = 'javascript';
    if (undefined === builder.fieldNames) {
      builder.fieldNames = [];
    } else {
      this.multiSelectOptions = this.buildMultiSelectOptions(builder.fieldNames);
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

  onInputChange = (event: FormEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    let value: any = event.currentTarget.value;
    if ('number' === event.currentTarget.type) {
      value = Number(value);
    }
    builder[event.currentTarget.name] = value;
    onOptionsChange({ ...options, builder: builder });
  };

  multiSelectOptions: Array<SelectableValue<string>> = [];

  buildMultiSelectOptions = (values: string[]): Array<SelectableValue<string>> => {
    return values.map((key, index) => {
      return { value: key, label: key };
    });
  };

  onSelectionChange = (options: Array<SelectableValue<string>>) => {
    this.selectOptions(options);
  };

  onCustomSelection = (selection: string) => {
    const option: SelectableValue<string> = { value: selection, label: selection };
    this.multiSelectOptions.push(option);
    this.selectOptions(this.multiSelectOptions);
  };

  selectOptions = (opts: Array<SelectableValue<string>>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.fieldNames = opts.map((o) => o.value);
    this.multiSelectOptions = this.buildMultiSelectOptions(builder.fieldNames);
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
              label="Name"
              name="name"
              type="text"
              placeholder="Output name for the summed value"
              value={builder.name}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Field names</label>
            <MultiSelect
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              options={this.multiSelectOptions}
              value={builder.fieldNames}
              allowCustomValue
            />
            <label className="gf-form-label">Aggregate function</label>
            <TextArea
              name="fnAggregate"
              placeholder="The javascript aggregate function. e.g: function(current, column1, column2, ...) {
                     <updates partial aggregate (current) based on the current row values>
                     return <updated partial aggregate>
                   }"
              value={builder.fnAggregate}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Combine function</label>
            <TextArea
              name="fnCombine"
              placeholder="The javascript combine function. e.g: function(partialA, partialB) { return <combined partial results>; }"
              value={builder.fnCombine}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Reset function</label>
            <TextArea
              name="fnReset"
              placeholder="The javascript reset function. e.g: function() { return <initial value>; }"
              value={builder.fnReset}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
