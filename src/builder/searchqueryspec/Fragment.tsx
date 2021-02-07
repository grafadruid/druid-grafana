import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Fragment extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'case_sensitive', 'values']);
    const { builder } = props.options;
    builder.type = 'fragment';
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
    builder.case_sensitive = event.currentTarget.checked;
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
            <Checkbox
              value={builder.case_sensitive}
              onChange={this.onCheckboxChange}
              label="Case sensitive"
              description="Specifies if the match should be case sensitive"
            />
            <label className="gf-form-label">Values</label>
            <MultiSelect
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              options={this.multiSelectOptions}
              value={builder.values}
              allowCustomValue
            />
          </div>
        </div>
      </>
    );
  }
}
