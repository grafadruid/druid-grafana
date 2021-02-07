import React, { PureComponent, FormEvent, ChangeEvent } from 'react';
import { MultiSelect, TextArea, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Javascript extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'name', 'fieldNames', 'function']);
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
            <label className="gf-form-label">Function</label>
            <TextArea
              name="function"
              placeholder="The javascript function. e.g: function(delta, total) { return 100 * Math.abs(delta) / total; }"
              value={builder.function}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
