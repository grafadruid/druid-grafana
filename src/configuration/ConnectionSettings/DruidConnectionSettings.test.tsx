import { shallow } from 'enzyme';
import * as React from 'react';

import { DruidConnectionSettings } from './DruidConnectionSettings';
import { ConnectionSettingsProps } from './types';

describe('DruidConnectionSettings', function () {
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
      const wrapper = shallow(<DruidConnectionSettings {...fakeProps} />);
      console.log(wrapper.debug());
      expect(wrapper.children()).toHaveLength(2);
    });
  });
});
