import React, { PureComponent, ChangeEvent } from 'react';
import { Select, Checkbox, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from '../extractionfn';

const { FormField } = LegacyForms;

export class Bound extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'type',
      'dimension',
      'lower',
      'upper',
      'lowerStrict',
      'upperStrict',
      'ordering',
      'extractionFn',
    ]);
    const { builder } = props.options;
    builder.type = 'bound';
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

  selectOptions: Record<string, Array<SelectableValue<string>>> = {
    ordering: [
      { label: 'Lexicographic', value: 'lexicographic' },
      { label: 'Alphanumeric', value: 'alphanumeric' },
      { label: 'String len', value: 'strlen' },
      { label: 'Numeric', value: 'numeric' },
      { label: 'Version', value: 'version' },
    ],
  };

  selectOptionByValue = (component: string, value: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.selectOptions[component].filter(option => option.value === value);
    if (options.length > 0) {
      return options[0];
    }
    return undefined;
  };

  onSelectionChange = (component: string, option: SelectableValue<string>) => {
    this.selectOption(component, option);
  };

  onCustomSelection = (component: string, selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions[component].push(option);
    this.selectOption(component, option);
  };

  selectOption = (component: string, option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = option.value;
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
            <FormField
              label="Dimension"
              name="dimension"
              type="text"
              placeholder="The dimension to filter on"
              value={builder.dimension}
              onChange={this.onInputChange}
            />
            <FormField
              label="Lower"
              name="lower"
              type="text"
              placeholder="The lower bound for the filter"
              value={builder.lower}
              onChange={this.onInputChange}
            />
            <FormField
              label="Upper"
              name="upper"
              type="text"
              placeholder="The upper bound for the filter"
              value={builder.upper}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.lowerStrict}
              onChange={this.onCheckboxChange.bind(this, 'lowerStrict')}
              label="Lower strict"
              description="Perform strict comparison on the lower bound ('>' instead of '>=')"
            />
            <Checkbox
              value={builder.upperStrict}
              onChange={this.onCheckboxChange.bind(this, 'upperStrict')}
              label="Upper strict"
              description="Perform strict comparison on the upper bound ('<' instead of '<=')"
            />
            <label className="gf-form-label">Ordering</label>
            <Select
              options={this.selectOptions.ordering}
              value={this.selectOptionByValue('ordering', builder.ordering)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'ordering')}
              onCreateOption={this.onCustomSelection.bind(this, 'ordering')}
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
