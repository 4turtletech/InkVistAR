import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import Home from './Home';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('../components/Navbar', () => () => null);
jest.mock('../components/Footer', () => () => null);
jest.mock('../components/DeferredChatWidget', () => () => null);
jest.mock('../components/ImageLightbox', () => () => null);

beforeEach(() => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  window.matchMedia = jest.fn(() => ({ matches: false }));
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('throttles desktop parallax updates through one animation frame', () => {
  let frameCallback;
  window.requestAnimationFrame = jest.fn((callback) => {
    frameCallback = callback;
    return 7;
  });
  window.cancelAnimationFrame = jest.fn();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });

  const { container } = render(<Home />);
  const home = container.querySelector('.home-container');

  fireEvent.scroll(window);
  fireEvent.scroll(window);

  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  frameCallback();
  expect(home.style.getPropertyValue('--ambient-one-y')).toBe('-30px');
  expect(home.style.getPropertyValue('--ambient-two-y')).toBe('-40px');
  expect(home.style.getPropertyValue('--hero-parallax-y')).toBe('80px');
  expect(home.style.getPropertyValue('--hero-overlay-opacity')).toBe('0.8');
});
