import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from './Home';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('../components/Navbar', () => () => null);
jest.mock('../components/Footer', () => () => null);
jest.mock('../components/DeferredChatWidget', () => () => null);
jest.mock('../components/ImageLightbox', () => () => null);

let intersectionObservers;

beforeEach(() => {
  intersectionObservers = [];
  global.fetch = jest.fn(() => new Promise(() => {}));
  window.matchMedia = jest.fn(() => ({ matches: false }));
  global.IntersectionObserver = class {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.targets = [];
      intersectionObservers.push(this);
    }

    observe(target) {
      this.targets.push(target);
    }

    unobserve(target) {
      this.targets = this.targets.filter(candidate => candidate !== target);
    }

    disconnect() {
      this.targets = [];
    }
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

test('exposes keyboard-accessible homepage landmarks and accordions', () => {
  const { container } = render(<Home />);

  expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getAllByRole('button', { name: /Open larger view/ })).toHaveLength(3);

  const question = screen.getByRole('button', { name: 'What is your minimum pricing?' });
  expect(question).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(question);
  expect(question).toHaveAttribute('aria-expanded', 'true');
  expect(container.querySelector('#faq-answer-0')).toHaveAttribute('aria-hidden', 'false');
});

test('defers bounded public data requests until their sections approach the viewport', () => {
  render(<Home />);

  expect(global.fetch).not.toHaveBeenCalled();

  const portfolioSection = screen.getByRole('heading', { name: 'Signatures in Ink' }).closest('section');
  const testimonialSection = screen.getByRole('heading', { name: 'The Experience' }).closest('section');
  const portfolioObserver = intersectionObservers.find(observer =>
    observer.options.rootMargin === '500px 0px' && observer.targets.includes(portfolioSection)
  );
  const testimonialObserver = intersectionObservers.find(observer =>
    observer.options.rootMargin === '500px 0px' && observer.targets.includes(testimonialSection)
  );

  act(() => {
    portfolioObserver.callback([{ isIntersecting: true, target: portfolioSection }]);
    testimonialObserver.callback([{ isIntersecting: true, target: testimonialSection }]);
  });

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/gallery/homepage'),
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/reviews?limit=6'),
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
});
