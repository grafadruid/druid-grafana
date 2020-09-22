import React, { FC, PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, Select, LegacyForms, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Granularity } from '../granularity';
import { Filter } from '../filter';
import { Interval } from '../date';
import { Dimension } from '../dimension';
import { SearchQuerySpec } from '../searchqueryspec';

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

const ComponentRow: FC<ComponentRowProps> = ({ index, component, props, onRemove }) => {
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

export class Search extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: { intervals: [], searchDimensions: [] },
  };

  selectOptions: Record<string, Array<SelectableValue<string>>> = {
    sort: [
      { label: 'Lexicographic', value: 'lexicographic' },
      { label: 'Alphanumeric', value: 'alphanumeric' },
      { label: 'String len', value: 'strlen' },
      { label: 'Numeric', value: 'numeric' },
      { label: 'Version', value: 'version' },
    ],
  };

  multiSelectOptions: Record<string, Array<SelectableValue<string>>> = { columns: [] };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'queryType',
      'dataSource',
      'granularity',
      'filter',
      'limit',
      'intervals',
      'searchDimensions',
      'query',
      'sort',
    ]);
    const { builder } = props.options;
    builder.queryType = 'search';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
    if (undefined === builder.intervals) {
      builder.intervals = [];
    }
    if (undefined === builder.searchDimensions) {
      builder.searchDimensions = [];
    }
    this.initializeState();
  }

  initializeState = () => {
    this.props.options.builder.intervals.forEach(() => {
      this.state.components['intervals'].push(uniqueId());
    });
    this.props.options.builder.searchDimensions.forEach(() => {
      this.state.components['searchDimensions'].push(uniqueId());
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

  onSelectionChange = (component: string, option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = option.value;
    onOptionsChange({ ...options, builder });
  };

  onCustomSelection = (component: string, selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions[component].push(option);
    this.onSelectionChange(component, option);
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
            <Granularity
              options={this.builderOptions('granularity')}
              onOptionsChange={this.onOptionsChange.bind(this, 'granularity')}
            />
            <Filter
              options={this.builderOptions('filter')}
              onOptionsChange={this.onOptionsChange.bind(this, 'filter')}
            />
            <FormField
              label="limit"
              name="limit"
              type="number"
              placeholder="How many rows to return"
              value={builder.limit}
              onChange={this.onInputChange}
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
            <div className="gf-form-group">
              <label className="gf-form-label">Search dimensions</label>
              <div>
                {builder.searchDimensions.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['searchDimensions'][index]}
                    index={index}
                    component={Dimension}
                    props={{
                      label: 'Search dimension',
                      options: this.componentOptions('searchDimensions', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'searchDimensions', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'searchDimensions')}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  this.onComponentAdd('searchDimensions');
                }}
              >
                Add dimension
              </Button>
            </div>
            <SearchQuerySpec
              options={this.builderOptions('query')}
              onOptionsChange={this.onOptionsChange.bind(this, 'query')}
            />
            <label className="gf-form-label">Sort</label>
            <Select
              options={this.selectOptions.sort}
              value={this.selectOptionByValue('sort', builder.sort)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'sort')}
              onCreateOption={this.onCustomSelection.bind(this, 'sort')}
            />
          </div>
        </div>
      </>
    );
  }
}
