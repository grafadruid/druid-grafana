import React from 'react';
import { RenderResult, render } from '@testing-library/react';

import { DruidAuthSettings } from '../configuration/ConnectionSettings/DruidAuthSettings';
import { ConnectionSettingsProps } from '../configuration/ConnectionSettings/types';

describe('<DruidAuthSettings />', () => {
  const fakeProps: ConnectionSettingsProps = {
    options: {
      settings: {
        basicAuth: false,
      },
      secretSettings: {},
      secretSettingsFields: {},
    },
    onOptionsChange() {},
  };
  beforeEach(() => {});

  describe('should display a form, with basic authentication unchecked by default', () => {
    it('shows basic & skip check buttons but not user & password fields', () => {
      let doc: RenderResult = render(<DruidAuthSettings {...fakeProps} />);
      expect(doc.getByTestId(/basicAuth/i)).toBeInTheDocument();
      const { queryByPlaceholderText } = render(<DruidAuthSettings {...fakeProps} />);
      expect(queryByPlaceholderText(/the user/i)).toBeNull();
    });
    describe('should display a form, with basic authentication checked', () => {
      it('shows user & password fields', () => {
        fakeProps.options.settings.basicAuth = true;
        let doc = render(<DruidAuthSettings {...fakeProps} />);
        expect(doc.getByPlaceholderText(/the user/i)).toBeInTheDocument();
        expect(doc.getByPlaceholderText(/the password/i)).toBeInTheDocument();
        fakeProps.options.settings.basicAuth = false;
      });
    });
    /*
    describe('should display a form, with basic authentication checked', () => {
      it('shows user & password fields', () => {
        fakeProps.options.settings.basicAuth = true;
        let { getByTestId } = render(<DruidAuthSettings {...fakeProps} />);
        fakeProps.options.settings.basicAuth = false;
        // const Authentication = getByTestId(`Authentication`);
        const withAuth = getByTestId(`basicAuth`);
        // const x1 = getByTestId(`user`);
        // expect(fakeProps.options.settings.basicAuth).toBe(false);

        fireEvent.click(withAuth);
        fireEvent.click(withAuth);
        console.log(withAuth);

        const x = getByTestId(`user`);
        expect(x).toBeInTheDocument();
        expect(fakeProps.options.settings.basicAuth).toBe(true);
        // expect(getByPlaceholderText(`the password`)).toBeInTheDocument();
        // fireEvent.click(screen.getAllByTestId('skipTls'));
        // expect(Authentication.queryByTestId(/the user/i)).toBeInTheDocument();
        // expect(doc.queryByTestId(/the password/i)).toBeInTheDocument();
      });
    });
    */
  });
});
