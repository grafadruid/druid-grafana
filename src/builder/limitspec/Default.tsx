import React, { FC, PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, Select, LegacyForms, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';

const { FormField } = LegacyForms;

interface State {
  components: string[];
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

class OrderByColumnSpecs extends PureComponent<QueryBuilderProps> {
  onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[event.target.name] = event.target.value;
    onOptionsChange({ ...options, builder: builder });
  };

  selectOptions: Record<string, Array<SelectableValue<string>>> = {
    direction: [
      { label: 'Ascending', value: 'ascending' },
      { label: 'Descending', value: 'descending' },
    ],
    dimensionOrder: [
      { label: 'Lexicographic', value: 'lexicographic' },
      { label: 'Alphanumeric', value: 'alphanumeric' },
      { label: 'String len', value: 'strlen' },
      { label: 'Numeric', value: 'numeric' },
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
              placeholder="any dimension or metric name"
              value={builder.dimension}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Direction</label>
            <Select
              options={this.selectOptions.direction}
              value={this.selectOptionByValue('direction', builder.direction)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'direction')}
              onCreateOption={this.onCustomSelection.bind(this, 'direction')}
            />
            <label className="gf-form-label">Dimension order</label>
            <Select
              options={this.selectOptions.dimensionOrder}
              value={this.selectOptionByValue('dimensionOrder', builder.dimensionOrder)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'dimensionOrder')}
              onCreateOption={this.onCustomSelection.bind(this, 'dimensionOrder')}
            />
          </div>
        </div>
      </>
    );
  }
}

export class Default extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: [],
  };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'limit', 'columns']);
    const { builder } = props.options;
    builder.type = 'default';
    if (undefined === builder.columns) {
      builder.columns = [];
    }
    this.initializeState();
  }

  initializeState = () => {
    this.props.options.builder.columns.forEach(() => {
      this.state.components.push(uniqueId());
    });
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
    builder[event.target.name] = event.target.value;
    onOptionsChange({ ...options, builder: builder });
  };

  componentOptions = (index: number): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    let componentBuilder = {};
    if (index <= builder.columns.length - 1) {
      componentBuilder = builder.columns[index];
    }
    return { builder: componentBuilder, settings: settings || {} };
  };

  onComponentOptionsChange = (index: number, componentOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder.columns[index] = componentOptions.builder;
    onOptionsChange({ ...options, builder, settings: { ...settings, ...componentOptions.settings } });
  };

  onComponentAdd = () => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.columns.push({});
    onOptionsChange({ ...options, builder });
    this.setState(({ components }) => {
      return { components: [...components, uniqueId()] };
    });
  };

  onComponentRemove = (index: number) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.columns = builder.columns.filter((element: any, idx: number) => index !== idx);
    onOptionsChange({ ...options, builder });
    this.setState(({ components }) => ({
      components: components.filter((element: string, idx: number) => {
        return idx !== index;
      }),
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
            <FormField
              label="Limit"
              name="limit"
              type="number"
              placeholder="the amount of rows to keep from the set of results"
              value={builder.limit}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Columns</label>
            <div>
              {builder.columns.map((item: any, index: number) => (
                <ComponentRow
                  key={components[index]}
                  index={index}
                  component={OrderByColumnSpecs}
                  props={{
                    options: this.componentOptions(index),
                    onOptionsChange: this.onComponentOptionsChange.bind(this, index),
                  }}
                  onRemove={this.onComponentRemove}
                />
              ))}
            </div>
            <Button variant="secondary" icon="plus" onClick={this.onComponentAdd}>
              Add column
            </Button>
          </div>
        </div>
      </>
    );
  }
}
