// import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { /*DruidAuthSettings, */ DruidHttpSettings } from './DruidHttpSettings';
import { ConnectionSettingsProps } from './types';

describe('DruidAuthSettings', function () {
  const fakeProps: ConnectionSettingsProps = {
    options: {
      settings: {
        basicAuth: false,
        basicAuthUser: 'fakeUser',
      },
      secretSettings: {},
      secretSettingsFields: {},
    },
    onOptionsChange() {},
  };
  describe('when initialized', () => {
    it('should render without basic authentication', function () {
      const wrapper = shallow(<DruidHttpSettings {...fakeProps} />);
      console.log(wrapper.debug());
      // expect(wrapper.find(FieldSet)).toHaveLength(1);
      // expect(wrapper.find(Field)).toHaveLength(1);
      // expect(wrapper.find(Switch)).toHaveLength(1);
      // expect(wrapper.find(Switch).prop('value')).toBe(false);
    });
  });
  describe('when user adds basic auth', () => {
    it('should render DruidBasicAuthSettings', function () {
      const wrapper = shallow(<DruidHttpSettings {...fakeProps} />);
      console.log(wrapper.debug());
      // expect(wrapper.find(FieldSet)).toHaveLength(1);
      // expect(wrapper.find(Field)).toHaveLength(1);
      // expect(wrapper.find(Switch)).toHaveLength(1);
      // wrapper.find(Switch).simulate('change', { currentTarget: { checked: true } });
      // expect(wrapper.state('switchStatus')).toEqual(true);
      // wrapper.setProps({
      //   options: {
      //     settings: {
      //       basicAuth: true,
      //       basicAuthUser: 'fakeUser',
      //     },
      //   },
      // });
      console.log(wrapper.debug());
      // expect(wrapper.find(DruidAuthSettings)).toHaveLength(1);
    });
  });
});
