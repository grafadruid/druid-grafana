import React, { FC, PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, LegacyForms, stylesFactory } from '@grafana/ui';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Interval } from '../date';
import { Granularity } from '../granularity';
import { Filter } from '../filter';
import { Aggregation } from '../aggregation';
import { PostAggregation } from '../postaggregation';
import { Dimension } from '../dimension';
import { TopNMetric } from '../topnmetric';
import { VirtualColumn } from '../virtualcolumn';

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
      <Button variant="secondary" size="xs" onClick={(_e) => onRemove(index)}>
        <Icon name="trash-alt" />
      </Button>
    </div>
  );
};

ComponentRow.displayName = 'ComponentRow';

export class TopN extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: { dimensions: [], aggregations: [], postAggregations: [], intervals: [], virtualColumns: [] },
  };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'queryType',
      'dataSource',
      'intervals',
      'granularity',
      'filter',
      'aggregations',
      'postAggregations',
      'dimension',
      'threshold',
      'metric',
      'virtualColumns',
    ]);
    const { builder } = props.options;
    builder.queryType = 'topN';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
    if (undefined === builder.intervals) {
      builder.intervals = [];
    }
    if (undefined === builder.aggregations) {
      builder.aggregations = [];
    }
    if (undefined === builder.postAggregations) {
      builder.postAggregations = [];
    }
    if (undefined === builder.virtualColumns) {
      builder.virtualColumns = [];
    }
    this.state = this.initialState();
  }

  initialState = (): State => {
    let state: State = {
      components: { dimensions: [], aggregations: [], postAggregations: [], intervals: [], virtualColumns: [] },
    };
    this.props.options.builder.intervals.forEach(() => {
      state.components.intervals.push(uniqueId());
    });
    this.props.options.builder.aggregations.forEach(() => {
      state.components.aggregations.push(uniqueId());
    });
    this.props.options.builder.postAggregations.forEach(() => {
      state.components.postAggregations.push(uniqueId());
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
            <Granularity
              options={this.builderOptions('granularity')}
              onOptionsChange={this.onOptionsChange.bind(this, 'granularity')}
            />
            <Filter
              options={this.builderOptions('filter')}
              onOptionsChange={this.onOptionsChange.bind(this, 'filter')}
            />
            <div className="gf-form-group">
              <label className="gf-form-label">Aggregations</label>
              <div>
                {builder.aggregations.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['aggregations'][index]}
                    index={index}
                    component={Aggregation}
                    props={{
                      options: this.componentOptions('aggregations', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'aggregations', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'aggregations')}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  this.onComponentAdd('aggregations');
                }}
              >
                Add an aggregation
              </Button>
            </div>
            <div className="gf-form-group">
              <label className="gf-form-label">Post aggregations</label>
              <div>
                {builder.postAggregations.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['postAggregations'][index]}
                    index={index}
                    component={PostAggregation}
                    props={{
                      options: this.componentOptions('postAggregations', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'postAggregations', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'postAggregations')}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                icon="plus"
                onClick={() => {
                  this.onComponentAdd('postAggregations');
                }}
              >
                Add a post aggregation
              </Button>
            </div>
            <Dimension
              options={this.builderOptions('dimension')}
              onOptionsChange={this.onOptionsChange.bind(this, 'dimension')}
            />
            <FormField
              label="Threshold"
              name="threshold"
              type="number"
              placeholder="How many results in the top list"
              value={builder.threshold}
              onChange={this.onInputChange}
            />
            <TopNMetric
              options={this.builderOptions('metric')}
              onOptionsChange={this.onOptionsChange.bind(this, 'metric')}
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
