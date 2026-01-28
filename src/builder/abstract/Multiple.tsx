import React, { ComponentType } from 'react';
import { InlineLabel, Button, Icon } from '@grafana/ui';
import { QueryBuilderFieldProps } from './types';
import { QueryBuilderOptions } from '../types';
import { onBuilderChange, Row } from '.';

interface Props extends QueryBuilderFieldProps {
  component: ComponentType<any>;
  componentExtraProps: any;
}

const useProxyBuilder = (props: Props): any => {
  let proxyBuilder: any = {};
  const componentBuilder = props.options.builder !== undefined ? props.options.builder : [];
  componentBuilder.forEach((value: any, index: number) => {
    proxyBuilder[props.name + '_' + index] = value;
  });
  const setBuilderWithProps = (builder: any) => {
    onBuilderChange(
      props,
      Object.entries(builder).map((builderEntry: any) => builderEntry[1])
    );
  };
  return [proxyBuilder, setBuilderWithProps];
};

export const Multiple = (props: Props) => {
  const Component = props.component;
  const [proxyBuilder, setProxyBuilder] = useProxyBuilder(props);
  const onComponentOptionsChange = (name: string, options: QueryBuilderOptions) => {
    setProxyBuilder({ ...proxyBuilder, [name]: options.builder });
  };
  
  // Check if component should render inline (from componentExtraProps)
  const inline = props.componentExtraProps?.inline || false;
  
  return (
    <>
      <InlineLabel width="auto" tooltip={props.description}>
        {props.label}
      </InlineLabel>
      {Object.entries(proxyBuilder).map((builderEntry: any, index: number) => {
        const componentElement = (
          <Component
            {...props}
            {...props.componentExtraProps}
            name={builderEntry[0]}
            options={{ ...props.options, builder: builderEntry[1] }}
            onOptionsChange={onComponentOptionsChange.bind(this, builderEntry[0])}
          />
        );
        const deleteButton = (
          <Button
            variant="secondary"
            size="xs"
            onClick={(event) => {
              setProxyBuilder(
                Object.fromEntries(Object.entries(proxyBuilder).filter((_: any, i: number) => i !== index))
              );
              event.preventDefault();
            }}
          >
            <Icon name="trash-alt" />
          </Button>
        );
        
        if (inline) {
          return (
            <React.Fragment key={index}>
              {componentElement}
              {deleteButton}
            </React.Fragment>
          );
        }
        
        return (
          <Row key={index}>
            {componentElement}
            {deleteButton}
          </Row>
        );
      })}
      <Button
        variant="secondary"
        icon="plus"
        onClick={(event) => {
          setProxyBuilder({ ...proxyBuilder, [props.name + '_' + Object.entries(proxyBuilder).length]: undefined });
          event.preventDefault();
        }}
      >
        Add
      </Button>
    </>
  );
};
