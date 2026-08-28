import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-router-dom', () => {
  const React = require('react');
  const RouterContext = React.createContext(null);

  const matchesPath = (pattern, pathname) => {
    const expression = pattern.replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${expression}$`).test(pathname);
  };

  const BrowserRouter = ({ children }) => {
    const [pathname, setPathname] = React.useState(globalThis.location.pathname);
    const navigate = React.useCallback((to) => {
      globalThis.history.replaceState({}, '', to);
      setPathname(to);
    }, []);

    return <RouterContext.Provider value={{ pathname, navigate }}>{children}</RouterContext.Provider>;
  };

  const Routes = ({ children }) => {
    const { pathname } = React.useContext(RouterContext);
    const route = React.Children.toArray(children).find((child) => matchesPath(child.props.path, pathname));
    return route?.props.element || null;
  };

  const Route = () => null;

  const Navigate = ({ to }) => {
    const { navigate } = React.useContext(RouterContext);
    React.useEffect(() => navigate(to), [navigate, to]);
    return null;
  };

  return { BrowserRouter, Routes, Route, Navigate };
}, { virtual: true });

jest.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }) => <div data-testid="captcha-provider">{children}</div>,
}));

jest.mock('./pages/Home', () => () => <div>Home page</div>);
jest.mock('./pages/Login', () => () => <div>Login page</div>);
jest.mock('./pages/Gallery', () => () => <div>Gallery page</div>);
jest.mock('./pages/AdminDashboard', () => () => <div>Admin dashboard</div>);
jest.mock('./pages/CustomerPortal', () => () => <div>Customer dashboard</div>);
jest.mock('./pages/MobileCaptcha', () => () => <div>Mobile CAPTCHA page</div>);

const renderAt = (path, user = null) => {
  window.history.pushState({}, '', path);
  if (user) localStorage.setItem('user', JSON.stringify(user));
  return render(<App />);
};

describe('application routing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  test('renders the eager homepage route', async () => {
    renderAt('/');

    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  test('loads a lazy public route', async () => {
    renderAt('/gallery');

    expect(await screen.findByText('Gallery page')).toBeInTheDocument();
  });

  test('redirects a signed-out visitor away from a protected route', async () => {
    renderAt('/admin/dashboard');

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  test('loads a protected route for an allowed role', async () => {
    renderAt('/admin/dashboard', { type: 'admin', name: 'Admin' });

    expect(await screen.findByText('Admin dashboard')).toBeInTheDocument();
  });

  test('redirects a signed-in user to the dashboard for their role', async () => {
    renderAt('/admin/dashboard', { type: 'customer', name: 'Customer' });

    expect(await screen.findByText('Customer dashboard')).toBeInTheDocument();
  });

  test('preserves the native mobile CAPTCHA entry point', async () => {
    renderAt('/?mobileCaptcha=register');

    expect(await screen.findByText('Mobile CAPTCHA page')).toBeInTheDocument();
  });
});
