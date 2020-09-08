import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { Dimension } from './';

export class ListFiltered extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'delegate', 'values', 'isWhitelist']);
    const { builder } = props.options;
    builder.type = 'listFiltered';
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

  onCheckboxChange = (component: string, event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
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
    builder.values = opts.map(o => o.value);
    this.multiSelectOptions = this.buildMultiSelectOptions(builder.values);
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
            <label className="gf-form-label">Delegate</label>
            <Dimension
              options={this.builderOptions('delegate')}
              onOptionsChange={this.onOptionsChange.bind(this, 'delegate')}
            />
            <label className="gf-form-label">Values</label>
            <MultiSelect
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              options={this.multiSelectOptions}
              value={builder.values}
              allowCustomValue
            />
            <Checkbox
              value={builder.isWhitelist}
              onChange={this.onCheckboxChange.bind(this, 'isWhitelist')}
              label="Is whitelist?"
              description="Specifies if the filtered dimension spec acts as a whitelist."
            />
          </div>
        </div>
      </>
    );
  }
}
