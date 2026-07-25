// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

// React 18 requires this flag for act()-aware rendering. The scaffolding setup does not set
// it, which makes @testing-library/react warn on every component render.
global.IS_REACT_ACT_ENVIRONMENT = true;
