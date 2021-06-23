import React, { ChangeEvent } from 'react';
import { InlineLabel, stylesFactory, useTheme } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';
import { css, cx } from 'emotion';
import { Global, css as globalCss } from '@emotion/core';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Props extends QueryBuilderFieldProps {
  format: string;
  time: boolean;
}

const useDate = (value = ''): any => {
  var date: Date | undefined = undefined;
  var datePlaceholder: string | undefined = undefined;
  const d = new Date(value);
  if (d instanceof Date && !isNaN(d.getFullYear())) {
    date = d;
  } else {
    datePlaceholder = value;
  }
  return [date, datePlaceholder];
};

export const DateTime = (props: Props) => {
  const [date, datePlaceholder] = useDate(props.options.builder);
  const onDateChangeRaw = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && value.indexOf('$') !== -1) {
      onBuilderChange(props, value);
    }
  };
  const onDateChange = (date: Date) => {
    onBuilderChange(props, date.toISOString());
  };
  const { label, description, format, time } = props;
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <>
      <Global styles={styles.popper} />
      <InlineLabel tooltip={description} width="auto">
        {label}
      </InlineLabel>
      <DatePicker
        selected={date}
        placeholderText={datePlaceholder}
        onChangeRaw={onDateChangeRaw}
        onChange={onDateChange}
        showTimeSelect={time}
        dateFormat={format}
        wrapperClassName={cx(styles.picker)}
      />
    </>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    picker: css`
      & input {
        border: 1px solid ${theme.colors.border2};
        height: 32px;
        margin-right: 4px;
      }
    `,
    popper: globalCss`
      .react-datepicker-popper {
        z-index: 1000 !important;
      }
    `,
  };
});
