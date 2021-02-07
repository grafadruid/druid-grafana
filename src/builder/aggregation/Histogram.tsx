import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Histogram extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'name', 'fieldName', 'breaks']);
    const { builder } = props.options;
    builder.type = 'histogram';
    if (undefined === builder.breaks) {
      builder.breaks = [];
    } else {
      this.multiSelectOptions.breaks = this.buildMultiSelectOptions(builder.breaks);
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

  multiSelectOptions: Record<string, Array<SelectableValue<number>>> = { breaks: [] };

  buildMultiSelectOptions = (values: number[]): Array<SelectableValue<number>> => {
    return values.map((key, index) => {
      return { value: key, label: String(key) };
    });
  };

  onSelectionChange = (component: string, options: Array<SelectableValue<number>>) => {
    this.selectOptions(component, options);
  };

  onCustomSelection = (component: string, selection: string) => {
    const value = Number(selection);
    if (isNaN(value)) {
      return;
    }
    const option: SelectableValue<number> = { value: value, label: selection };
    this.multiSelectOptions[component].push(option);
    this.selectOptions(component, this.multiSelectOptions[component]);
  };

  selectOptions = (component: string, opts: Array<SelectableValue<number>>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = opts.map((o) => o.value);
    this.multiSelectOptions[component] = this.buildMultiSelectOptions(builder[component]);
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
            <FormField
              label="Field name"
              name="fieldName"
              type="text"
              placeholder="Name of the metric column to sum over"
              value={builder.fieldName}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Breaks</label>
            <MultiSelect
              onChange={this.onSelectionChange.bind(this, 'breaks')}
              onCreateOption={this.onCustomSelection.bind(this, 'breaks')}
              options={this.multiSelectOptions.breaks}
              value={builder.breaks}
              allowCustomValue
            />
          </div>
        </div>
      </>
    );
  }
}
