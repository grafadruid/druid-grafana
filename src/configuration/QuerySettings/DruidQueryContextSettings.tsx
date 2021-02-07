import React, { FC, PureComponent } from 'react';
import { css } from 'emotion';
import uniqueId from 'lodash/uniqueId';
import { LegacyForms, Button, Icon, stylesFactory } from '@grafana/ui';
import { QuerySettingsProps } from './types';

interface Parameter {
  id: string;
  name: string;
  value: any;
}

interface State {
  parameters: Parameter[];
}

interface ParameterRowProps {
  parameter: Parameter;
  onRemove: (id: string) => void;
  onChange: (value: Parameter) => void;
  onBlur: () => void;
}

const getParameterRowStyles = stylesFactory(() => {
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

const ParameterRow: FC<ParameterRowProps> = ({ parameter, onBlur, onChange, onRemove }: ParameterRowProps) => {
  const styles = getParameterRowStyles();
  const { FormField } = LegacyForms;

  return (
    <div className={styles.layout}>
      <FormField
        label="Name"
        name="name"
        placeholder="Parameter name. e.g: timeout"
        labelWidth={5}
        value={parameter.name || ''}
        onChange={(e) => onChange({ ...parameter, name: e.target.value })}
        onBlur={onBlur}
      />
      <FormField
        label="Value"
        name="value"
        value={parameter.value}
        labelWidth={5}
        placeholder="parameter value. e.g: 10"
        onChange={(e) => onChange({ ...parameter, value: e.currentTarget.value })}
        onBlur={onBlur}
      />
      <Button variant="secondary" size="xs" onClick={(_e) => onRemove(parameter.id)}>
        <Icon name="trash-alt" />
      </Button>
    </div>
  );
};

ParameterRow.displayName = 'ParameterRow';

export class DruidQueryContextSettings extends PureComponent<QuerySettingsProps, State> {
  state: State = {
    parameters: [],
  };

  constructor(props: QuerySettingsProps) {
    super(props);

    const { options } = this.props;
    const { settings } = options;

    if (settings.contextParameters === undefined) {
      settings.contextParameters = [];
    }
    this.state = {
      parameters: settings.contextParameters.sort().map((parameter, index) => {
        return {
          id: uniqueId(),
          name: parameter.name,
          value: parameter.value,
        };
      }),
    };
  }

  updateSettings = () => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;

    settings.contextParameters = this.state.parameters.sort().map((parameter, index) => {
      return {
        name: parameter.name,
        value: parameter.value,
      };
    });
    onOptionsChange({ ...options, settings: settings });
  };

  onParameterAdd = () => {
    this.setState((prevState) => {
      return { parameters: [...prevState.parameters, { id: uniqueId(), name: '', value: '' }] };
    }, this.updateSettings);
  };

  onParameterChange = (parameterIndex: number, value: Parameter) => {
    this.setState(({ parameters }) => {
      return {
        parameters: parameters.map((item, index) => {
          if (parameterIndex !== index) {
            return item;
          }
          return { ...value };
        }),
      };
    });
  };

  onParameterRemove = (parameterId: string) => {
    this.setState(
      ({ parameters }) => ({
        parameters: parameters.filter((p) => p.id !== parameterId),
      }),
      this.updateSettings
    );
  };

  render() {
    const { parameters } = this.state;
    return (
      <div className={'gf-form-group'}>
        <h3 className="page-heading">Query context</h3>
        <div>
          {parameters.map((parameter, i) => (
            <ParameterRow
              key={parameter.id}
              parameter={parameter}
              onChange={(p) => {
                this.onParameterChange(i, p);
              }}
              onBlur={this.updateSettings}
              onRemove={this.onParameterRemove}
            />
          ))}
        </div>
        <Button variant="secondary" icon="plus" onClick={this.onParameterAdd}>
          Add parameter
        </Button>
      </div>
    );
  }
}
