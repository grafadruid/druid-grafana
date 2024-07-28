import React, { ReactNode } from 'react';
import { InlineFieldRow, useStyles } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';
import { css, cx } from '@emotion/css';

interface Props {
  children: ReactNode | ReactNode[];
}

export const Row = (props: Props) => {
  const styles = useStyles(getStyles);
  return <InlineFieldRow className={cx(styles.row)}>{props.children}</InlineFieldRow>;
};

const getStyles = (theme: GrafanaTheme) => ({
  row: css`
    width: 100%;
    padding-bottom: 5px;
    & > & {
      border-left: 1px solid ${theme.colors.border2};
      padding: 5px 0 5px 10px;
    }
  `,
});
