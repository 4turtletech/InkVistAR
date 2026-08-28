import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { RECAPTCHA_SITE_KEY } from './config';
import './App.css';
import './styles/premium-transitions.css';

import Home from './pages/Home';
import { MAINTENANCE_CONFIG } from './maintenanceConfig';
const Login = lazy(() => import('./pages/Login'));
const Artists = lazy(() => import('./pages/Artists'));
const PublicArtistProfile = lazy(() => import('./pages/PublicArtistProfile'));
const Register = lazy(() => import('./pages/Register'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Contact = lazy(() => import('./pages/Contact'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAppointments = lazy(() => import('./pages/AdminAppointments'));
const AdminStaff = lazy(() => import('./pages/AdminStaff'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminPOS = lazy(() => import('./pages/AdminPOS'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminStudio = lazy(() => import('./pages/AdminStudio'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminBilling = lazy(() => import('./pages/AdminBilling'));
const AdminChat = lazy(() => import('./pages/AdminChat'));
const AdminNotifications = lazy(() => import('./pages/AdminNotifications'));
const AdminBusinessReports = lazy(() => import('./pages/AdminBusinessReports'));
const AppointmentPrintView = lazy(() => import('./pages/AppointmentPrintView'));
const WaiverPrintView = lazy(() => import('./pages/WaiverPrintView'));
const CustomerNotifications = lazy(() => import('./pages/CustomerNotifications'));
const ArtistPortal = lazy(() => import('./pages/ArtistPortal'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const ManagerPortal = lazy(() => import('./pages/ManagerPortal'));
const ManagerAnalytics = lazy(() => import('./pages/ManagerAnalytics'));
const ManagerAppointments = lazy(() => import('./pages/ManagerAppointments'));
const ManagerUsers = lazy(() => import('./pages/ManagerUsers'));
const ArtistAppointments = lazy(() => import('./pages/ArtistAppointments'));
const ArtistEarnings = lazy(() => import('./pages/ArtistEarnings'));
const ArtistProfile = lazy(() => import('./pages/ArtistProfile'));
const ArtistSessions = lazy(() => import('./pages/ArtistSessions'));
const ArtistNotifications = lazy(() => import('./pages/ArtistNotifications'));
const ArtistGallery = lazy(() => import('./pages/ArtistGallery'));
const CustomerBookings = lazy(() => import('./pages/CustomerBookings'));
const CustomerGallery = lazy(() => import('./pages/CustomerGallery'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const CustomerBookingCreate = lazy(() => import('./pages/CustomerBookingCreate'));
const CustomerReview = lazy(() => import('./pages/CustomerReview'));
const CustomerTransactions = lazy(() => import('./pages/CustomerTransactions'));
const PaymentSimulation = lazy(() => import('./pages/PaymentSimulation'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const PayMongoPayment = lazy(() => import('./pages/PayMongoPayment'));
const CustomerInvoice = lazy(() => import('./pages/CustomerInvoice'));
const CustomerAftercare = lazy(() => import('./pages/CustomerAftercare'));
const CustomerReports = lazy(() => import('./pages/CustomerReports'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const MaintenanceNotice = lazy(() => import('./pages/MaintenanceNotice'));
const MobileCaptcha = lazy(() => import('./pages/MobileCaptcha'));

const RouteLoader = () => (
  <div className="route-loader" role="status" aria-live="polite">
    <span className="route-loader-mark" aria-hidden="true">IV</span>
    <span>Loading InkVictus...</span>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.type)) {
        if (user.type === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (user.type === 'manager') return <Navigate to="/manager" replace />;
        if (user.type === 'artist') return <Navigate to="/artist" replace />;
        if (user.type === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
        if (user.type === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (user.type === 'manager') return <Navigate to="/manager" replace />;
        if (user.type === 'artist') return <Navigate to="/artist" replace />;
        if (user.type === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
  const isMobileCaptchaRequest = new URLSearchParams(window.location.search).get('mobileCaptcha') === 'register';

  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <Suspense fallback={<RouteLoader />}>
        {isMobileCaptchaRequest ? <MobileCaptcha /> : (
        <div className="App">
          <Router>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artist/:id" element={<PublicArtistProfile />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={MAINTENANCE_CONFIG.disableBooking ? <MaintenanceNotice type="booking" /> : <PublicBooking />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={MAINTENANCE_CONFIG.disableRegistration ? <MaintenanceNotice type="registration" /> : <PublicRoute><Register /></PublicRoute>} />
            <Route path="/admin" element={<PublicRoute><AdminLogin /></PublicRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminAppointments /></ProtectedRoute>} />
            <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminStaff /></ProtectedRoute>} />
            <Route path="/admin/studio" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudio /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><AdminClients /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={['admin']}><AdminBilling /></ProtectedRoute>} />
            <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={['admin']}><AdminChat /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
            <Route path="/admin/appointments/:id/print" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AppointmentPrintView /></ProtectedRoute>} />
            <Route path="/admin/appointments/:id/waiver" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><WaiverPrintView /></ProtectedRoute>} />
            <Route path="/artist" element={<ProtectedRoute allowedRoles={['artist']}><ArtistPortal /></ProtectedRoute>} />
            <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><CustomerPortal /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerPortal /></ProtectedRoute>} />
            <Route path="/manager/users" element={<ProtectedRoute allowedRoles={['manager']}><ManagerUsers /></ProtectedRoute>} />
            <Route path="/manager/appointments" element={<ProtectedRoute allowedRoles={['manager']}><ManagerAppointments /></ProtectedRoute>} />
            <Route path="/manager/analytics" element={<ProtectedRoute allowedRoles={['manager']}><ManagerAnalytics /></ProtectedRoute>} />
            <Route path="/manager/staff" element={<ProtectedRoute allowedRoles={['manager']}><AdminStaff /></ProtectedRoute>} />
            <Route path="/manager/inventory" element={<ProtectedRoute allowedRoles={['manager']}><AdminInventory /></ProtectedRoute>} />
            <Route path="/artist/appointments" element={<ProtectedRoute allowedRoles={['artist']}><ArtistAppointments /></ProtectedRoute>} />
            <Route path="/artist/earnings" element={<ProtectedRoute allowedRoles={['artist']}><ArtistEarnings /></ProtectedRoute>} />
            <Route path="/artist/sessions" element={<ProtectedRoute allowedRoles={['artist']}><ArtistSessions /></ProtectedRoute>} />
            <Route path="/artist/notifications" element={<ProtectedRoute allowedRoles={['artist']}><ArtistNotifications /></ProtectedRoute>} />
            <Route path="/artist/profile" element={<ProtectedRoute allowedRoles={['artist']}><ArtistProfile /></ProtectedRoute>} />
            <Route path="/artist/gallery" element={<ProtectedRoute allowedRoles={['artist']}><ArtistGallery /></ProtectedRoute>} />
            <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['customer']}><CustomerBookings /></ProtectedRoute>} />
            <Route path="/customer/gallery" element={<ProtectedRoute allowedRoles={['customer']}><CustomerGallery /></ProtectedRoute>} />
            <Route path="/customer/book" element={MAINTENANCE_CONFIG.disableBooking ? <MaintenanceNotice type="booking" /> : <ProtectedRoute allowedRoles={['customer']}><CustomerBookingCreate /></ProtectedRoute>} />
            <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
            <Route path="/customer/notifications" element={<ProtectedRoute allowedRoles={['customer']}><CustomerNotifications /></ProtectedRoute>} />
            <Route path="/customer/reviews/new" element={<ProtectedRoute allowedRoles={['customer']}><CustomerReview /></ProtectedRoute>} />
            <Route path="/customer/transactions" element={<ProtectedRoute allowedRoles={['customer']}><CustomerTransactions /></ProtectedRoute>} />
            <Route path="/customer/invoice/:invoiceNumber" element={<ProtectedRoute allowedRoles={['customer']}><CustomerInvoice /></ProtectedRoute>} />
            <Route path="/customer/aftercare" element={<ProtectedRoute allowedRoles={['customer']}><CustomerAftercare /></ProtectedRoute>} />
            <Route path="/customer/reports" element={<ProtectedRoute allowedRoles={['customer']}><CustomerReports /></ProtectedRoute>} />
            <Route path="/customer/waiver/:id" element={<ProtectedRoute allowedRoles={['customer']}><WaiverPrintView /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute allowedRoles={['customer']}><PaymentSimulation /></ProtectedRoute>} />
            <Route path="/pay-mongo" element={<PayMongoPayment />} />
            <Route path="/booking-confirmation" element={<ProtectedRoute allowedRoles={['customer']}><BookingConfirmation /></ProtectedRoute>} />
            <Route path="/admin/pos" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminPOS /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminInventory /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminBusinessReports /></ProtectedRoute>} />

            </Routes>
          </Router>
        </div>
        )}
      </Suspense>
    </GoogleReCaptchaProvider>
  );
}

export default App;
