import React, { PureComponent, ChangeEvent } from 'react';
import { Select, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from '../extractionfn';

const { FormField } = LegacyForms;

export class Extraction extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'dimension', 'outputName', 'outputType', 'extractionFn']);
    const { builder } = props.options;
    builder.type = 'extraction';
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

  selectOptions: Array<SelectableValue<string>> = [
    { label: 'String', value: 'STRING' },
    { label: 'Long', value: 'LONG' },
    { label: 'Float', value: 'FLOAT' },
  ];

  selectOptionByValue = (value: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.selectOptions.filter((option) => option.value === value);
    if (options.length > 0) {
      return options[0];
    }
    return undefined;
  };

  onSelectionChange = (option: SelectableValue<string>) => {
    this.selectOption(option);
  };

  onCustomSelection = (selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions.push(option);
    this.selectOption(option);
  };

  selectOption = (option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder.outputType = option.value;
    onOptionsChange({ ...options, builder, settings });
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
            <label className="gf-form-label">Output type</label>
            <Select
              options={this.selectOptions}
              value={this.selectOptionByValue(builder.outputType)}
              allowCustomValue
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              isClearable={true}
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
