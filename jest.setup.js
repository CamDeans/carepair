jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (Component) => Component,
  captureException: jest.fn(),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const Mock = (p) => React.createElement('View', p, p.children);
  return { __esModule: true, default: Mock, Circle: Mock, Rect: Mock, Svg: Mock };
});
