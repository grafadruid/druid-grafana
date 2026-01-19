import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { QueryBuilderFieldProps, QueryBuilderComponent, QueryComponent, Component } from './types';
import { cloneDeep } from 'lodash';

export const enum ScopeType {
  Builder,
  Settings,
}

export const initBuilder = (prevBuilder: any, component: QueryBuilderComponent<QueryComponent | Component>): any => {
  let builder: any = {};
  if ('type' in component) {
    builder.type = component.type;
  }
  if ('queryType' in component) {
    builder.queryType = component.queryType;
  }
  component.fields.forEach((field) => {
    builder[field] = prevBuilder[field];
  });
  return builder;
};

export const useScopedQueryBuilderProps = (
  props: QueryBuilderProps,
  component: QueryBuilderComponent<QueryComponent | Component>
) => {
  const builder = initBuilder(props.options.builder || {}, component);
  const rootBuilder = props.rootBuilder || props.options.builder;
  return (name: string | undefined, scopeType: ScopeType = ScopeType.Builder): QueryBuilderProps => {
    if (name === undefined) {
      name = '';
    }
    let scopedProps = cloneDeep(props);
    scopedProps.options.builder = name in builder ? builder[name] : undefined;
    scopedProps.rootBuilder = rootBuilder;
    scopedProps.onOptionsChange = (options: QueryBuilderOptions) => {
      console.error('useScopedQueryBuilderProps onOptionsChange called', { name, options, builder });
      let newBuilder: any = {};
      if (name === undefined) {
        name = '';
      }
      if (name in builder) {
        newBuilder = { ...builder, [name]: options.builder };
      } else {
        newBuilder = { ...builder, ...options.builder };
      }
      let newOptions = { ...options, builder: newBuilder };
      console.error('useScopedQueryBuilderProps: calling parent with', { newOptions });
      props.onOptionsChange(newOptions);
    };
    return scopedProps;
  };
};

export const useScopedQueryBuilderFieldProps = (
  props: QueryBuilderProps,
  component: QueryBuilderComponent<QueryComponent | Component>
) => {
  const builder = initBuilder(props.options.builder || {}, component);
  const rootBuilder = props.rootBuilder || props.options.builder;
  return (name: string | undefined, scopeType: ScopeType = ScopeType.Builder): QueryBuilderFieldProps => {
    if (name === undefined) {
      name = '';
    }
    let scopedProps: QueryBuilderFieldProps = { name: name, label: '', description: '', ...cloneDeep(props) };
    scopedProps.options.builder = name in builder ? builder[name] : undefined;
    scopedProps.rootBuilder = rootBuilder;
    scopedProps.onOptionsChange = (options: QueryBuilderOptions) => {
      console.error('useScopedQueryBuilderFieldProps onOptionsChange called', { name, options, builder });
      let newBuilder: any = {};
      if (name === undefined) {
        name = '';
      }
      if (name in builder) {
        newBuilder = { ...builder, [name]: options.builder };
      } else {
        newBuilder = { ...builder, ...options.builder };
      }
      let newOptions = { ...options, builder: newBuilder };
      console.error('useScopedQueryBuilderFieldProps: calling parent with', { newOptions });
      props.onOptionsChange(newOptions);
    };
    return scopedProps;
  };
};

export const onBuilderChange = (props: QueryBuilderProps | QueryBuilderFieldProps | undefined, builder: any) => {
  console.error('onBuilderChange called', {
    hasProps: !!props,
    currentBuilder: props?.options?.builder,
    newBuilder: builder,
    willChange: props && builder !== props.options.builder,
    hasOnChange: props && 'onChange' in props && props.onChange !== undefined,
  });
  if (undefined !== props && builder !== props.options.builder) {
    'onChange' in props && props.onChange !== undefined
      ? props.onChange(builder)
      : props.onOptionsChange({ ...props.options, builder: builder });
  } else {
    console.error('onBuilderChange: skipping - builder unchanged or props undefined');
  }
};

export const useQueryBuilderAutoSubmit = (props: QueryBuilderProps, component: QueryBuilderComponent<Component>) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, component);
  if (
    props.options.builder === null ||
    props.options.builder === undefined ||
    props.options.builder.type !== component.type
  ) {
    const { options, onOptionsChange } = scopedProps(undefined);
    onOptionsChange(options);
  }
};
