import { useRef, useState } from 'react';

export const SITE_CURTAIN_STORAGE_KEY = 'inkvistar-site-unlocked';
export const SITE_CURTAIN_COOKIE_KEY = 'inkvistar_site_access';
export const SITE_CURTAIN_TAP_COUNT = 10;
export const SITE_CURTAIN_TAP_WINDOW_MS = 10000;
export const SITE_CURTAIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const hasAccessCookie = () => document.cookie
  .split(';')
  .map((part) => part.trim())
  .some((part) => part === `${SITE_CURTAIN_COOKIE_KEY}=1`);

const hasSessionAccess = () => {
  try {
    return window.sessionStorage.getItem(SITE_CURTAIN_STORAGE_KEY) === '1'
      || hasAccessCookie();
  } catch {
    return false;
  }
};

const rememberBrowserAccess = () => {
  const isProductionDomain = window.location.hostname === 'inkvictusstudio.com'
    || window.location.hostname.endsWith('.inkvictusstudio.com');
  const domain = isProductionDomain ? '; Domain=inkvictusstudio.com' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${SITE_CURTAIN_COOKIE_KEY}=1; Max-Age=${SITE_CURTAIN_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}${domain}`;
};

const removePrivateAccessQuery = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('privateAccess')) return;

  url.searchParams.delete('privateAccess');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
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
    rememberBrowserAccess();
    removePrivateAccessQuery();
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
