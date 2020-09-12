import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms, InfoBox } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from '../extractionfn';

const { FormField } = LegacyForms;

interface State {
  showInfo: boolean;
}

export class Extraction extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    showInfo: true,
  };
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'dimension', 'value', 'extractionFn']);
    const { builder } = props.options;
    builder.type = 'extraction';
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
    builder[event.target.name] = event.target.value;
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

  render() {
    const { builder } = this.props.options;
    const { showInfo } = this.state;
    return (
      <>
        {showInfo && (
          <InfoBox
            title="Deprecated"
            url={'https://druid.apache.org/docs/latest/querying/filters.html#extraction-filter'}
            onDismiss={() => {
              this.setState({ showInfo: false });
            }}
          >
            <p>
              The extraction filter is now deprecated. The selector filter with an extraction function specified
              provides identical functionality and should be used instead.
            </p>
          </InfoBox>
        )}
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
              placeholder="the dimension name"
              value={builder.dimension}
              onChange={this.onInputChange}
            />
            <FormField
              label="Value"
              name="value"
              type="text"
              placeholder="the dimension value"
              value={builder.value}
              onChange={this.onInputChange}
            />
            <ExtractionFn
              options={this.builderOptions('extractionFn')}
              onOptionsChange={this.onOptionsChange.bind(this, 'extractionFn')}
            />
          </div>
        </div>
      </>
    );
  }
}
