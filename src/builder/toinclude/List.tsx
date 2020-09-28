import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps } from '../types';

export class List extends PureComponent<QueryBuilderProps> {
  multiSelectOptions: Record<string, Array<SelectableValue<string>>> = { columns: [] };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type']);
    const { builder } = props.options;
    builder.type = 'list';
    if (undefined === builder.columns) {
      builder.columns = [];
    } else {
      this.multiSelectOptions.columns = this.buildMultiSelectOptions(builder.columns);
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

  buildMultiSelectOptions = (values: string[]): Array<SelectableValue<string>> => {
    return values.map((key, index) => {
      return { value: key, label: String(key) };
    });
  };

  onMultiSelectSelectionChange = (component: string, opts: Array<SelectableValue<string>>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = opts.map(o => o.value);
    this.multiSelectOptions[component] = this.buildMultiSelectOptions(builder[component]);
    onOptionsChange({ ...options, builder });
  };

  onMultiSelectCustomSelection = (component: string, selection: string) => {
    const option: SelectableValue<string> = { value: selection, label: selection };
    this.multiSelectOptions[component].push(option);
    this.onMultiSelectSelectionChange(component, this.multiSelectOptions[component]);
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
            <label className="gf-form-label">Columns</label>
            <MultiSelect
              onChange={this.onMultiSelectSelectionChange.bind(this, 'columns')}
              onCreateOption={this.onMultiSelectCustomSelection.bind(this, 'columns')}
              options={this.multiSelectOptions.columns}
              value={builder.columns}
              allowCustomValue
            />
          </div>
        </div>
      </>
    );
  }
}
