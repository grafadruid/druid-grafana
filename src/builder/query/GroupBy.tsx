import React, { FC, PureComponent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, stylesFactory } from '@grafana/ui';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DataSource } from '../datasource';
import { Dimension } from '../dimension';
import { LimitSpec } from '../limitspec';
import { HavingSpec } from '../havingspec';
import { Granularity } from '../granularity';
import { Filter } from '../filter';
import { Aggregation } from '../aggregation';

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
      align-items: center;
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

export class GroupBy extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: { dimensions: [], aggregations: [] },
  };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([
      'queryType',
      'dataSource',
      'dimensions',
      'limitSpec',
      'having',
      'granularity',
      'filter',
      'aggregations',
    ]);
    const { builder } = props.options;
    builder.queryType = 'groupBy';
    if (undefined === builder.dataSource) {
      builder.dataSource = {};
    }
    if (undefined === builder.dimensions) {
      builder.dimensions = [];
    }
    if (undefined === builder.aggregations) {
      builder.aggregations = [];
    }
    this.initializeState();
  }

  initializeState = () => {
    this.props.options.builder.dimensions.forEach(() => {
      this.state.components['dimensions'].push(uniqueId());
    });
    this.props.options.builder.aggregations.forEach(() => {
      this.state.components['aggregations'].push(uniqueId());
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
    console.log('JBG', builder);
    onOptionsChange({ ...options, builder, settings: { ...settings, ...componentOptions.settings } });
  };

  onComponentAdd = (component: string) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component].push({});
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
              <label className="gf-form-label">Dimensions</label>
              <div>
                {builder.dimensions.map((item: any, index: number) => (
                  <ComponentRow
                    key={components['dimensions'][index]}
                    index={index}
                    component={Dimension}
                    props={{
                      options: this.componentOptions('dimensions', index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, 'dimensions', index),
                    }}
                    onRemove={this.onComponentRemove.bind(this, 'dimensions')}
                  />
                ))}
              </div>
              <Button variant="secondary" icon="plus" onClick={this.onComponentAdd.bind(this, 'dimensions')}>
                Add a dimension
              </Button>
            </div>
            <LimitSpec
              options={this.builderOptions('limitSpec')}
              onOptionsChange={this.onOptionsChange.bind(this, 'limitSpec')}
            />
            <HavingSpec
              options={this.builderOptions('having')}
              onOptionsChange={this.onOptionsChange.bind(this, 'having')}
            />
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
              <Button variant="secondary" icon="plus" onClick={this.onComponentAdd.bind(this, 'aggregations')}>
                Add an aggregation
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }
}
