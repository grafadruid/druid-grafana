import React, { PureComponent, ChangeEvent } from 'react';
import { Select, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Dimension extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'ordering', 'previousStop']);
    const { builder } = props.options;
    builder.type = 'dimension';
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
            <label className="gf-form-label">Ordering</label>
            <Select
              options={this.selectOptions.ordering}
              value={this.selectOptionByValue('ordering', builder.ordering)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'ordering')}
              onCreateOption={this.onCustomSelection.bind(this, 'ordering')}
              isClearable={true}
            />
            <FormField
              label="Previous stop"
              name="previousStop"
              type="text"
              placeholder="the starting point of the sort"
              value={builder.previousStop}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
