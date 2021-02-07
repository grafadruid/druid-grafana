import React, { PureComponent, ChangeEvent } from 'react';
import { MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from '../extractionfn';

const { FormField } = LegacyForms;

export class In extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'dimension', 'values', 'extractionFn']);
    const { builder } = props.options;
    builder.type = 'in';
    if (undefined === builder.values) {
      builder.values = [];
    } else {
      this.multiSelectOptions = this.buildMultiSelectOptions(builder.values);
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
    builder[event.target.name] = event.target.value;
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
    builder.values = opts.map((o) => o.value);
    this.multiSelectOptions = this.buildMultiSelectOptions(builder.values);
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
            <label className="gf-form-label">Values</label>
            <MultiSelect
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              options={this.multiSelectOptions}
              value={builder.values}
              allowCustomValue
            />
            <ExtractionFn
              options={this.builderOptions('extractionFn')}
              onOptionsChange={this.onOptionsChange.bind(this, 'extractionFn')}
            />
          </div>
        </div>
      </>
    );
  }
}
