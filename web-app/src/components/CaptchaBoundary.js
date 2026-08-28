import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { RECAPTCHA_SITE_KEY } from '../config';

const CaptchaBoundary = ({ children }) => (
  <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
    {children}
  </GoogleReCaptchaProvider>
);

export default CaptchaBoundary;
