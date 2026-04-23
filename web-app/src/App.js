import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { RECAPTCHA_SITE_KEY } from './config';
import './App.css';
import './styles/premium-transitions.css';

import Home from './pages/Home';
import Login from './pages/Login';
import Artists from './pages/Artists';
import PublicArtistProfile from './pages/PublicArtistProfile';
import Register from './pages/Register';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import PublicBooking from './pages/PublicBooking';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAppointments from './pages/AdminAppointments';
import AdminStaff from './pages/AdminStaff';
import AdminInventory from './pages/AdminInventory';
import AdminPOS from './pages/AdminPOS';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminSettings from './pages/AdminSettings';
import AdminStudio from './pages/AdminStudio';
import AdminClients from './pages/AdminClients';
import AdminBilling from './pages/AdminBilling';
import AdminChat from './pages/AdminChat';
import AdminNotifications from './pages/AdminNotifications';
import AppointmentPrintView from './pages/AppointmentPrintView';

import CustomerNotifications from './pages/CustomerNotifications';

import ArtistPortal from './pages/ArtistPortal';
import CustomerPortal from './pages/CustomerPortal';
import ManagerPortal from './pages/ManagerPortal';
import ManagerAnalytics from './pages/ManagerAnalytics';
import ManagerAppointments from './pages/ManagerAppointments';
import ManagerUsers from './pages/ManagerUsers';
import ArtistAppointments from './pages/ArtistAppointments';
import ArtistEarnings from './pages/ArtistEarnings';
import ArtistProfile from './pages/ArtistProfile';
import ArtistSessions from './pages/ArtistSessions';
import ArtistNotifications from './pages/ArtistNotifications';

import ArtistGallery from './pages/ArtistGallery';
import CustomerBookings from './pages/CustomerBookings';
import CustomerGallery from './pages/CustomerGallery';
import CustomerProfile from './pages/CustomerProfile';
import CustomerBookingCreate from './pages/CustomerBookingCreate';
import CustomerReview from './pages/CustomerReview';
import CustomerTransactions from './pages/CustomerTransactions';
import PaymentSimulation from './pages/PaymentSimulation';
import BookingConfirmation from './pages/BookingConfirmation';
import PayMongoPayment from './pages/PayMongoPayment';
import CustomerInvoice from './pages/CustomerInvoice';
import CustomerAftercare from './pages/CustomerAftercare';



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
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <div className="App">
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artist/:id" element={<PublicArtistProfile />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={<PublicBooking />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
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
            {/* <Route path="/customer/book" element={<ProtectedRoute allowedRoles={['customer']}><CustomerBookingCreate /></ProtectedRoute>} /> */}
            <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
            <Route path="/customer/notifications" element={<ProtectedRoute allowedRoles={['customer']}><CustomerNotifications /></ProtectedRoute>} />
            <Route path="/customer/reviews/new" element={<ProtectedRoute allowedRoles={['customer']}><CustomerReview /></ProtectedRoute>} />
            <Route path="/customer/transactions" element={<ProtectedRoute allowedRoles={['customer']}><CustomerTransactions /></ProtectedRoute>} />
            <Route path="/customer/invoice/:invoiceNumber" element={<ProtectedRoute allowedRoles={['customer']}><CustomerInvoice /></ProtectedRoute>} />
            <Route path="/customer/aftercare" element={<ProtectedRoute allowedRoles={['customer']}><CustomerAftercare /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute allowedRoles={['customer']}><PaymentSimulation /></ProtectedRoute>} />
            <Route path="/pay-mongo" element={<PayMongoPayment />} />
            <Route path="/booking-confirmation" element={<ProtectedRoute allowedRoles={['customer']}><BookingConfirmation /></ProtectedRoute>} />
            <Route path="/admin/pos" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminPOS /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminInventory /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

          </Routes>
        </Router>
      </div>
    </GoogleReCaptchaProvider>
  );
}

export default App;
