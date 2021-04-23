import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { DruidAuthSettings } from './DruidAuthSettings';
import { ConnectionSettingsProps } from './types';

describe('A suite', function () {
  const fakeProps: ConnectionSettingsProps = {
    options: {
      settings: {
        basicAuth: true,
      },
      secretSettings: {},
      secretSettingsFields: {},
    },
    onOptionsChange() {},
  };
  it('should render without throwing an error', function () {
    const wrapper = shallow(<DruidAuthSettings {...fakeProps} />);
    console.log(wrapper.debug());

    expect(wrapper.find(FieldSet)).toHaveLength(1);
    expect(wrapper.find(Field)).toHaveLength(2);
    expect(wrapper.find(Switch)).toHaveLength(2);
    const x = wrapper.find(Switch);
    expect(x.find('.value')).toBeTruthy();
  });
});
