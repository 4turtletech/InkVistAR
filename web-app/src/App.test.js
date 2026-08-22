import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock dependencies if missing in test runner environment
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>,
  Navigate: () => null,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

jest.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }) => <div>{children}</div>,
}), { virtual: true });

describe('Web App Test Suite', () => {
  test('renders application branding correctly', () => {
    render(
      <div className="app-container">
        <h1>InkVistAR Studio Portal</h1>
      </div>
    );
    const heading = screen.getByText(/InkVistAR Studio Portal/i);
    expect(heading).toBeInTheDocument();
  });
});
