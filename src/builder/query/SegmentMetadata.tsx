import React, { FC, PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, MultiSelect, Checkbox, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Interval } from '../date';
import { ToInclude } from '../toinclude';

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

export class SegmentMetadata extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: { intervals: [] },
  };

  multiSelectOptions: Record<string, Array<SelectableValue<string>>> = { analysisTypes: [] };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'queryType',
      'dataSource',
      'intervals',
      'toInclude',
      'merge',
      'analysisTypes',
      'lenientAggregatorMerge',
      'usingDefaultInterval',
    ]);
    this.multiSelectOptions.analysisTypes = this.buildMultiSelectOptions([
      'cardinality',
      'minmax',
      'size',
      'minmax',
      'interval',
      'timestampSpec',
      'queryGranularity',
      'aggregators',
      'rollup',
    ]);
    const { builder } = props.options;
    builder.queryType = 'segmentMetadata';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
    if (undefined === builder.intervals) {
      builder.intervals = [];
    }
    this.initializeState();
  }

  initializeState = () => {
    this.props.options.builder.intervals.forEach(() => {
      this.state.components['intervals'].push(uniqueId());
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

  buildMultiSelectOptions = (values: string[]): Array<SelectableValue<string>> => {
    return values.map((key, index) => {
      return { value: key, label: String(key) };
    });
  };

  onMultiSelectSelectionChange = (component: string, opts: Array<SelectableValue<string>>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = opts.map(o => o.value);
    onOptionsChange({ ...options, builder });
  };

  onMultiSelectCustomSelection = (component: string, selection: string) => {
    const { builder } = this.props.options;
    const option: SelectableValue<string> = { value: selection, label: selection };
    this.multiSelectOptions[component].push(option);
    this.onMultiSelectSelectionChange(component, this.buildMultiSelectOptions([...builder[component], selection]));
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
            <ToInclude
              options={this.builderOptions('toInclude')}
              onOptionsChange={this.onOptionsChange.bind(this, 'toInclude')}
            />
            <Checkbox
              value={builder.merge}
              onChange={this.onCheckboxChange.bind(this, 'merge')}
              label="Merge"
              description="Merge all individual segment metadata results into a single result"
            />
            <label className="gf-form-label">Analysis types</label>
            <MultiSelect
              onChange={this.onMultiSelectSelectionChange.bind(this, 'analysisTypes')}
              onCreateOption={this.onMultiSelectCustomSelection.bind(this, 'analysisTypes')}
              options={this.multiSelectOptions.analysisTypes}
              value={builder.analysisTypes}
              allowCustomValue
            />
            <Checkbox
              value={builder.lenientAggregatorMerge}
              onChange={this.onCheckboxChange.bind(this, 'lenientAggregatorMerge')}
              label="Lenient aggregator merge"
              description="Define if aggregators should be merged leniently"
            />
            <Checkbox
              value={builder.usingDefaultInterval}
              onChange={this.onCheckboxChange.bind(this, 'usingDefaultInterval')}
              label="Using default interval"
              description="Define if it uses the default interval"
            />
          </div>
        </div>
      </>
    );
  }
}
