import { useRef, useState } from 'react';

export const SITE_CURTAIN_STORAGE_KEY = 'inkvistar-site-unlocked';
export const SITE_CURTAIN_TAP_COUNT = 10;
export const SITE_CURTAIN_TAP_WINDOW_MS = 10000;

const hasSessionAccess = () => {
  try {
    return window.sessionStorage.getItem(SITE_CURTAIN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberSessionAccess = () => {
  try {
    window.sessionStorage.setItem(SITE_CURTAIN_STORAGE_KEY, '1');
  } catch {
    // The current page can still unlock when storage is unavailable.
  }
};

const SiteCurtain = ({ children, bypass = false }) => {
  const [unlocked, setUnlocked] = useState(hasSessionAccess);
  const tapCountRef = useRef(0);
  const firstTapAtRef = useRef(0);

  if (bypass || unlocked) return children;

  const handleHiddenTap = () => {
    const now = Date.now();
    const tapWindowExpired = !firstTapAtRef.current
      || now - firstTapAtRef.current > SITE_CURTAIN_TAP_WINDOW_MS;

    if (tapWindowExpired) {
      firstTapAtRef.current = now;
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }

    if (tapCountRef.current < SITE_CURTAIN_TAP_COUNT) return;

    rememberSessionAccess();
    tapCountRef.current = 0;
    firstTapAtRef.current = 0;
    setUnlocked(true);
  };

  return (
    <div className="site-curtain" data-testid="site-curtain">
      <button
        type="button"
        className="site-curtain-hotspot"
        onClick={handleHiddenTap}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};

export default SiteCurtain;
