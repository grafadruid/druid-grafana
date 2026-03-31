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
    if (scopeType === ScopeType.Settings) {
      scopedProps.options = { ...scopedProps.options, builder: props.options.settings?.[name] };
    } else {
      scopedProps.options.builder = name in builder ? builder[name] : undefined;
    }
    scopedProps.rootBuilder = rootBuilder;
    scopedProps.onOptionsChange = (options: QueryBuilderOptions) => {
      if (name === undefined) {
        name = '';
      }
      if (scopeType === ScopeType.Settings) {
        const newSettings = { ...(props.options.settings || {}), [name]: options.builder };
        props.onOptionsChange({ ...props.options, settings: newSettings });
        return;
      }
      const isPlainObject =
        options.builder != null &&
        typeof options.builder === 'object' &&
        !Array.isArray(options.builder);
      let newBuilder: any;
      if (name in builder) {
        newBuilder = { ...builder, [name]: options.builder };
      } else if (isPlainObject) {
        newBuilder = { ...builder, ...options.builder };
      } else {
        newBuilder = { ...builder, [name]: options.builder };
      }
      props.onOptionsChange({ ...options, builder: newBuilder });
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
    if (scopeType === ScopeType.Settings) {
      scopedProps.options = { ...scopedProps.options, builder: props.options.settings?.[name] };
    } else {
      scopedProps.options.builder = name in builder ? builder[name] : undefined;
    }
    scopedProps.rootBuilder = rootBuilder;
    scopedProps.onOptionsChange = (options: QueryBuilderOptions) => {
      if (name === undefined) {
        name = '';
      }
      if (scopeType === ScopeType.Settings) {
        const newSettings = { ...(props.options.settings || {}), [name]: options.builder };
        props.onOptionsChange({ ...props.options, settings: newSettings });
        return;
      }
      const isPlainObject =
        options.builder != null &&
        typeof options.builder === 'object' &&
        !Array.isArray(options.builder);
      let newBuilder: any;
      if (name in builder) {
        newBuilder = { ...builder, [name]: options.builder };
      } else if (isPlainObject) {
        newBuilder = { ...builder, ...options.builder };
      } else {
        newBuilder = { ...builder, [name]: options.builder };
      }
      props.onOptionsChange({ ...options, builder: newBuilder });
    };
    return scopedProps;
  };
};

export const onBuilderChange = (props: QueryBuilderProps | QueryBuilderFieldProps | undefined, builder: any) => {
  if (undefined !== props && builder !== props.options.builder) {
    'onChange' in props && props.onChange !== undefined
      ? props.onChange(builder)
      : props.onOptionsChange({ ...props.options, builder: builder });
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
