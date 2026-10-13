import { fireEvent, render, screen } from '@testing-library/react';
import SiteCurtain, {
  SITE_CURTAIN_STORAGE_KEY,
  SITE_CURTAIN_TAP_COUNT,
} from './SiteCurtain';

describe('SiteCurtain', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test('renders only the blank curtain before it is unlocked', () => {
    render(<SiteCurtain><div>Private application</div></SiteCurtain>);

    expect(screen.getByTestId('site-curtain')).toBeInTheDocument();
    expect(screen.queryByText('Private application')).not.toBeInTheDocument();
  });

  test('unlocks after ten hidden hotspot clicks for the browser session', () => {
    const { container } = render(
      <SiteCurtain><div>Private application</div></SiteCurtain>
    );
    const hotspot = container.querySelector('.site-curtain-hotspot');

    for (let click = 0; click < SITE_CURTAIN_TAP_COUNT; click += 1) {
      fireEvent.click(hotspot);
    }

    expect(screen.getByText('Private application')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SITE_CURTAIN_STORAGE_KEY)).toBe('1');
  });

  test('allows explicitly bypassed technical flows', () => {
    render(<SiteCurtain bypass><div>Mobile CAPTCHA</div></SiteCurtain>);

    expect(screen.getByText('Mobile CAPTCHA')).toBeInTheDocument();
    expect(screen.queryByTestId('site-curtain')).not.toBeInTheDocument();
  });
});
