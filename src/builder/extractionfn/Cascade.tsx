import React, { FC, PureComponent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { Button, Icon, stylesFactory } from '@grafana/ui';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from './';

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

export class Cascade extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    components: [],
  };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'extractionFns']);
    const { builder } = props.options;
    builder.type = 'cascade';
    if (undefined === builder.extractionFns) {
      builder.extractionFns = [];
    }
    this.initializeState();
  }

  initializeState = () => {
    this.props.options.builder.extractionFns.forEach(() => {
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

  componentOptions = (index: number): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    let componentBuilder = {};
    if (index <= builder.extractionFns.length - 1) {
      componentBuilder = builder.extractionFns[index];
    }
    return { builder: componentBuilder, settings: settings || {} };
  };

  onComponentOptionsChange = (index: number, componentOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder.extractionFns[index] = componentOptions.builder;
    onOptionsChange({ ...options, builder, settings: { ...settings, ...componentOptions.settings } });
  };

  onComponentAdd = () => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.extractionFns.push({});
    onOptionsChange({ ...options, builder });
    this.setState(({ components }) => {
      return { components: [...components, uniqueId()] };
    });
  };

  onComponentRemove = (index: number) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.extractionFns = builder.extractionFns.filter((element: any, idx: number) => index !== idx);
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
              width: 250px;
            `}
          >
            <div className="gf-form-group">
              <label className="gf-form-label">Extraction functions</label>
              <div>
                {builder.extractionFns.map((item: any, index: number) => (
                  <ComponentRow
                    key={components[index]}
                    index={index}
                    component={ExtractionFn}
                    props={{
                      options: this.componentOptions(index),
                      onOptionsChange: this.onComponentOptionsChange.bind(this, index),
                    }}
                    onRemove={this.onComponentRemove}
                  />
                ))}
              </div>
              <Button variant="secondary" icon="plus" onClick={this.onComponentAdd}>
                Add extraction function
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }
}
