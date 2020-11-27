import React, { FC, PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, Select, MultiSelect, LegacyForms, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Filter } from '../filter';
import { VirtualColumn } from '../virtualcolumn';
import { Interval } from '../date';

const { FormField } = LegacyForms;

interface State {
  components: Record<string, string[]>;
}

interface ComponentRowProps {
  index: number;
  component: any;
  props: any;
  onRemove: (index: number) => void;
}

const getComponentRowStyles = stylesFactory(() => {
  return {
    layout: css`
      display: flex;
      margin-bottom: 4px;
      > * {
        margin-left: 4px;
        margin-bottom: 0;
        height: 100%;
        &:first-child,
        &:last-child {
          margin-left: 0;
        }
      }
    `,
  };
});

const ComponentRow: FC<ComponentRowProps> = ({ index, component, props, onRemove }: ComponentRowProps) => {
  const styles = getComponentRowStyles();
  const Component = component;
  return (
    <div className={styles.layout}>
      <Component {...props} />
      <Button variant="secondary" size="xs" onClick={_e => onRemove(index)}>
        <Icon name="trash-alt" />
      </Button>
    </div>
  );
};

ComponentRow.displayName = 'ComponentRow';

export class Scan extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: { intervals: [], virtualColumns: [] },
  };

  selectOptions: Record<string, Array<SelectableValue<string>>> = {
    order: [
      { label: 'None', value: 'none' },
      { label: 'Ascending', value: 'ascending' },
      { label: 'Descending', value: 'descending' },
    ],
  };

  multiSelectOptions: Record<string, Array<SelectableValue<string>>> = { columns: [] };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'queryType',
      'dataSource',
      'intervals',
      'filter',
      'columns',
      'batchSize',
      'limit',
      'order',
      'virtualColumns',
    ]);
    const { builder } = props.options;
    builder.queryType = 'scan';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
    if (undefined === builder.columns) {
      builder.columns = [];
    } else {
      this.multiSelectOptions.columns = this.buildMultiSelectOptions(builder.columns);
    }
    if (undefined === builder.intervals) {
      builder.intervals = [];
    }
    if (undefined === builder.virtualColumns) {
      builder.virtualColumns = [];
    }
    this.state = this.initialState();
  }

  initialState = (): State => {
    let state: State = {
      components: { intervals: [], virtualColumns: [] },
    };
    this.props.options.builder.intervals.forEach(() => {
      state.components.intervals.push(uniqueId());
    });
    this.props.options.builder.virtualColumns.forEach(() => {
      state.components.virtualColumns.push(uniqueId());
    });
    return state;
  };

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

  onOptionsChange = (component: string, componentBuilderOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = componentBuilderOptions.builder;
    onOptionsChange({ ...options, builder, settings });
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

  buildMultiSelectOptions = (values: string[]): Array<SelectableValue<string>> => {
    return values.map((key, index) => {
      return { value: key, label: String(key) };
    });
  };

  onSelectionChange = (component: string, option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = option.value;
    onOptionsChange({ ...options, builder });
  };

  onCustomSelection = (component: string, selection: string) => {
    const option: SelectableValue<string> = { value: selection, label: selection };
    this.selectOptions[component].push(option);
    this.onSelectionChange(component, option);
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

  builderOptions = (component: string): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder[component] || {}, settings: settings || {} };
  };

  componentOptions = (component: string, index: number): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    let componentBuilder = {};
    if (index <= builder[component].length - 1) {
      componentBuilder = builder[component][index];
    }
    return { builder: componentBuilder, settings: settings || {} };
  };

  onComponentOptionsChange = (component: string, index: number, componentOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component][index] = componentOptions.builder;
    onOptionsChange({ ...options, builder, settings: { ...settings, ...componentOptions.settings } });
  };

  onComponentAdd = (component: string, builderDataType = 'object') => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    let builderValue = {};
    switch (builderDataType) {
      case 'string': {
        builderValue = '';
        break;
      }
      case 'array': {
        builderValue = [];
        break;
      }
    }
    builder[component].push(builderValue);
    onOptionsChange({ ...options, builder });
    this.setState(({ components }) => {
      components[component].push(uniqueId());
      return { components: components };
    });
  };

  onComponentRemove = (component: string, index: number) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = builder[component].filter((element: any, idx: number) => index !== idx);
    onOptionsChange({ ...options, builder });
    this.setState(({ components }) => ({
      components: {
        ...components,
        ...{
          [component]: components[component].filter((element: string, idx: number) => {
            return idx !== index;
          }),
        },
      },
    }));
  };

  render() {
    const { builder } = this.props.options;
    const { components } = this.state;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <DataSource
              options={this.builderOptions('dataSource')}
              onOptionsChange={this.onOptionsChange.bind(this, 'dataSource')}
            />
            <div className="gf-form-group">
              <label className="gf-form-label">Intervals</label>
              <div>
                {builder.intervals.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['intervals'][index]}
                    index={index}
                    component={Interval}
                    props={{
                      label: 'Interval',
                      options: this.componentOptions('intervals', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'intervals', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'intervals')}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  this.onComponentAdd('intervals', 'string');
                }}
              >
                Add interval
              </Button>
            </div>
            <Filter
              options={this.builderOptions('filter')}
              onOptionsChange={this.onOptionsChange.bind(this, 'filter')}
            />
            <label className="gf-form-label">Columns</label>
            <MultiSelect
              onChange={this.onMultiSelectSelectionChange.bind(this, 'columns')}
              onCreateOption={this.onMultiSelectCustomSelection.bind(this, 'columns')}
              options={this.multiSelectOptions.columns}
              value={builder.columns}
              allowCustomValue
            />
            <FormField
              label="batchSize"
              name="batchSize"
              type="number"
              placeholder="The maximum number of rows buffered"
              value={builder.batchSize}
              onChange={this.onInputChange}
            />
            <FormField
              label="limit"
              name="limit"
              type="number"
              placeholder="How many rows to return"
              value={builder.limit}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Order</label>
            <Select
              options={this.selectOptions.order}
              value={this.selectOptionByValue('order', builder.order)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'order')}
              onCreateOption={this.onCustomSelection.bind(this, 'order')}
              isClearable={true}
            />
            <div className="gf-form-group">
              <label className="gf-form-label">Virtual columns</label>
              <div>
                {builder.virtualColumns.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['virtualColumns'][index]}
                    index={index}
                    component={VirtualColumn}
                    props={{
                      options: this.componentOptions('virtualColumns', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'virtualColumns', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'virtualColumns')}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  this.onComponentAdd('virtualColumns');
                }}
              >
                Add a virtual column
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }
}
