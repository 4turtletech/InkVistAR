/**
 * screens/App.js -- Main Navigation Hub
 * Tab bar icons migrated from Ionicons to lucide-react-native.
 * All auth flows, tab navigators, and stack screens preserved.
 */

import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, Alert, ScrollView, TextInput, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as NavigationBar from 'expo-navigation-bar';
import {
  Home, Images, Camera, MessageSquare, Calendar, UserRound, ShieldCheck,
  Users, Server, ArrowLeft, Briefcase,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// Import main screens
import { LoginPage } from './screens/LoginPage.jsx';
import { RegisterPage } from './screens/RegisterPage.jsx';
import { CustomerDashboard } from './screens/CustomerDashboard.jsx';
import { ArtistDashboard } from './screens/ArtistDashboard.jsx';
import { ResetPasswordPage } from './screens/ResetPasswordPage.jsx';

// Import customer pages
import { CustomerProfilePage } from './screens/CustomerProfilePage.jsx';
import { CustomerARPage } from './screens/CustomerARPage.jsx';
import { CustomerChatbotPage } from './screens/CustomerChatbotPage.jsx';
import { CustomerAppointments } from './screens/CustomerAppointments.jsx';
import { CustomerArtistDirectory } from './screens/CustomerArtistDirectory.jsx';
import { CustomerArtistProfile } from './screens/CustomerArtistProfile.jsx';

// Import artist pages
import { ArtistProfile } from './screens/ArtistProfile.jsx';
import { ArtistSchedule } from './screens/ArtistSchedule.jsx';
import { ArtistClients } from './screens/ArtistClients.jsx';
import { ArtistWorks } from './screens/ArtistWorks.jsx';
import { ArtistEarnings } from './screens/ArtistEarnings.jsx';
import { ArtistNotifications } from './screens/ArtistNotifications.jsx';
import { ArtistActiveSession } from './screens/ArtistActiveSession.jsx';
import { ArtistClientDetails } from './screens/ArtistClientDetails.jsx';

// Import Admin pages
import { AdminDashboard } from './screens/AdminDashboard.jsx';
import { AdminUserManagement } from './screens/AdminUserManagement.jsx';
import { AdminAppointmentManagement } from './screens/AdminAppointmentManagement.jsx';
import { AdminSystemHealth } from './screens/AdminSystemHealth.jsx';

// Import New Admin Features
import { AdminServices } from './screens/AdminServices.jsx';
import { AdminStaffScheduling } from './screens/AdminStaffScheduling.jsx';
import { AdminInventory } from './screens/AdminInventory.jsx';
import { AdminTasks } from './screens/AdminTasks.jsx';
import { AdminNotifications } from './screens/AdminNotifications.jsx';
import { AdminAnalytics } from './screens/AdminAnalytics.jsx';
import { AdminSettings } from './screens/AdminSettings.jsx';

// Import SIMPLE components
import { SimpleARPreview } from './components/Mobile/SimpleARPreview';
import { CustomerBooking } from './screens/CustomerBooking.jsx';
import { CustomerGallery } from './screens/CustomerGallery.jsx';

// Import OTP Component
import { OTPVerification } from './components/OTPVerification';

// Import API
import { loginUser, registerUser, sendOTP, resetUserPassword, deleteArtistWork, saveAuthToken } from './src/utils/api';

import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon map for lucide
const CUSTOMER_TAB_ICONS = { Home, Gallery: Images, AR: Camera, Chat: MessageSquare, Appointments: Calendar, Profile: UserRound };
const ARTIST_TAB_ICONS = { Home, Schedule: Calendar, Clients: Users, Works: Images, Profile: UserRound };
const ADMIN_TAB_ICONS = { Dashboard: ShieldCheck, Users, Bookings: Calendar, System: Server };

// Artist Appointment Details Screen
const ArtistAppointmentDetailsScreen = ({ navigation, route }) => {
  const { appointment } = route.params || {};
  if (!appointment) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <Text>No appointment data found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 50 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
        <ArrowLeft size={22} color="#333" />
        <Text style={{ marginLeft: 10, fontSize: 16, color: '#333' }}>Back to Schedule</Text>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>{appointment.design_title || 'Appointment Details'}</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 20 }}>For: {appointment.client_name}</Text>

        {appointment.reference_image && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#111' }}>Reference Image</Text>
            <Image source={{ uri: appointment.reference_image }} style={{ width: '100%', height: 300, borderRadius: 12, backgroundColor: '#f3f4f6' }} resizeMode="contain" />
          </View>
        )}

        <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#111' }}>Details</Text>
          {[
            ['Date', new Date(appointment.appointment_date).toLocaleDateString()],
            ['Time', appointment.start_time],
            ['Status', appointment.status],
          ].map(([label, val]) => (
            <View key={label} style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>{label}</Text>
              <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500', textTransform: label === 'Status' ? 'capitalize' : 'none' }}>{val}</Text>
            </View>
          ))}
          <View>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Client Notes</Text>
            <Text style={{ fontSize: 16, color: '#1f2937' }}>{appointment.notes || 'No notes provided.'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [showOTP, setShowOTP] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginUserType, setLoginUserType] = useState('customer');

  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => setUser(null) },
      ]
    );
  };
  
  useEffect(() => {
    console.log('User state changed:', user ? `Logged in as ${user.name}` : 'Not logged in');
  }, [user]);
  
  const hideNavigationBar = () => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
    }
  };
  
  useEffect(() => {
    console.log('App starting - ensuring clean state');
    setUser(null);
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  const handleResendVerification = async (email) => {
    try {
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const result = await response.json();
      result.success ? Alert.alert('Success', result.message) : Alert.alert('Error', result.message || 'Failed to resend link');
    } catch (error) { Alert.alert('Error', 'Could not connect to server'); }
  };

  const handleLogin = async (email, password, userType) => {
    const result = await loginUser(email, password, userType);
    if (result && result.success === true && result.user && result.user.name) {
      if (result.token) await saveAuthToken(result.token);
      setUser(result.user);
    } else {
      if (result?.requireVerification) {
        Alert.alert('Verification Required', result.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resend Link', onPress: () => handleResendVerification(email) }
        ]);
      } else {
        alert('Login failed: ' + (result?.message || 'Invalid credentials'));
      }
    }
    return result;
  };

  const handleForgotPassword = async (email, type) => {
    const selectedType = type || 'customer';
    const result = await sendOTP(email, selectedType);
    if (result.success) {
      setLoginEmail(email); setLoginUserType(selectedType); setIsResetMode(true); setShowOTP(true);
    } else { alert(result.message || 'Failed to send OTP.'); }
  };

  const handleOTPVerified = (verifiedUser) => {
    if (isResetMode) { setShowOTP(false); setShowResetPassword(true); }
    else { setUser(verifiedUser); setShowOTP(false); }
  };

  const handlePasswordReset = async (newPassword) => {
    const result = await resetUserPassword(loginEmail, newPassword);
    if (result.success) { alert('Password updated successfully! Please login.'); setShowResetPassword(false); setIsResetMode(false); }
    else { alert('Failed to update password: ' + result.message); }
  };

  const handleRegister = async (name, email, password, phone, userType, navigation) => {
    const registerResult = await registerUser(name, email, password, userType, phone);
    if (registerResult.success && registerResult.message) {
      if (navigation) navigation.navigate('login', { prefillEmail: email, message: registerResult.message });
    } else { alert('Registration failed: ' + (registerResult.message || 'Please try again')); }
    return registerResult;
  };

  // Customer Tab Navigator
  const CustomerTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e7eb', height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => {
          const Icon = CUSTOMER_TAB_ICONS[route.name];
          return Icon ? <Icon size={22} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <CustomerDashboard {...props} userName={user.name} userId={user.id} onNavigate={props.navigation.navigate} onLogout={confirmLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Gallery">
        {(props) => <CustomerGallery {...props} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="AR">
        {(props) => <SimpleARPreview {...props} selectedDesign={{ name: 'Sample', type: 'Preview' }} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="Chat">
        {(props) => <CustomerChatbotPage {...props} userId={user.id} userName={user.name} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="Appointments">
        {(props) => <CustomerAppointments {...props} customerId={user.id} onBack={() => props.navigation.navigate('Home')} onBookNew={() => props.navigation.navigate('booking-create')} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <CustomerProfilePage {...props} userName={user.name} userEmail={user.email} userId={user.id} onBack={() => props.navigation.navigate('Home')} onLogout={confirmLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );

  // Admin Tab Navigator
  const AdminTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1f2937', borderTopColor: '#374151', height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => {
          const Icon = ADMIN_TAB_ICONS[route.name];
          return Icon ? <Icon size={22} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <AdminDashboard {...props} onLogout={confirmLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Users" component={AdminUserManagement} />
      <Tab.Screen name="Bookings" component={AdminAppointmentManagement} />
      <Tab.Screen name="System" component={AdminSystemHealth} />
    </Tab.Navigator>
  );

  // Artist Tab Navigator
  const ArtistTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e7eb', height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => {
          const Icon = ARTIST_TAB_ICONS[route.name];
          return Icon ? <Icon size={22} color={color} /> : null;
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <ArtistDashboard {...props} userName={user.name} userEmail={user.email} userId={user.id} onNavigate={props.navigation.navigate} onLogout={confirmLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Schedule">
        {(props) => <ArtistSchedule {...props} artistId={user.id} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="Clients">
        {(props) => <ArtistClients {...props} artistId={user.id} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="Works">
        {(props) => <ArtistWorks {...props} artistId={user.id} onBack={() => props.navigation.navigate('Home')} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ArtistProfile {...props} userName={user.name} userEmail={user.email} onBack={() => props.navigation.navigate('Home')} onLogout={confirmLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );

  return (
    <View style={{ flex: 1 }} onTouchStart={Platform.OS === 'android' ? hideNavigationBar : undefined}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            user.type === 'admin' ? (
              <>
              <Stack.Screen name="admin-main" component={AdminTabs} />
              <Stack.Screen name="admin-services" component={AdminServices} />
              <Stack.Screen name="admin-staff" component={AdminStaffScheduling} />
              <Stack.Screen name="admin-inventory" component={AdminInventory} />
              <Stack.Screen name="admin-tasks" component={AdminTasks} />
              <Stack.Screen name="admin-notifications" component={AdminNotifications} />
              <Stack.Screen name="admin-analytics" component={AdminAnalytics} />
              <Stack.Screen name="admin-settings" component={AdminSettings} />
              </>
            ) : user.type === 'artist' ? (
              <>
                <Stack.Screen name="artist-main" component={ArtistTabs} />
                <Stack.Screen name="artist-earnings">
                  {(props) => <ArtistEarnings {...props} artistId={user.id} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
                <Stack.Screen name="artist-notifications">
                  {(props) => <ArtistNotifications {...props} userId={user.id} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
                <Stack.Screen name="artist-client-details">
                  {(props) => <ArtistClientDetails {...props} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
                <Stack.Screen name="artist-appointment-details" component={ArtistAppointmentDetailsScreen} />
                <Stack.Screen name="artist-active-session">
                  {(props) => (
                    <ArtistActiveSession
                      {...props}
                      appointment={props.route.params.appointment}
                      onBack={() => props.navigation.goBack()}
                      onComplete={() => props.navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="artist-work-details">
                  {(props) => (
                    <View style={{flex:1, backgroundColor:'white', justifyContent:'center', alignItems:'center'}}>
                      <Text>Work Details (Coming Soon)</Text>
                      <TouchableOpacity
                        style={{marginTop: 20, padding: 10, backgroundColor: 'red'}}
                        onPress={() => deleteArtistWork('test-id-123')}
                      >
                        <Text style={{color: 'white'}}>TEST SOFT DELETE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => props.navigation.goBack()}><Text>Back</Text></TouchableOpacity>
                    </View>
                  )}
                </Stack.Screen>
              </>
            ) : (
              <>
                <Stack.Screen name="customer-main" component={CustomerTabs} />
                <Stack.Screen name="chatbot-enhanced">
                  {(props) => <CustomerChatbotPage {...props} userId={user.id} userName={user.name} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
                <Stack.Screen name="customer-notifications">
                  {(props) => <ArtistNotifications {...props} userId={user.id} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
                <Stack.Screen name="customer-artists">
                  {(props) => <CustomerArtistDirectory {...props} onBack={() => props.navigation.goBack()} onNavigate={props.navigation.navigate} />}
                </Stack.Screen>
                <Stack.Screen name="CustomerArtistProfile">
                  {(props) => <CustomerArtistProfile {...props} onBack={() => props.navigation.goBack()} onNavigate={props.navigation.navigate} />}
                </Stack.Screen>
                <Stack.Screen name="booking-create">
                  {(props) => <CustomerBooking {...props} customerId={user.id} onBack={() => props.navigation.goBack()} />}
                </Stack.Screen>
              </>
            )
          ) : showOTP ? (
            <Stack.Screen name="otp">
              {(props) => (
                <OTPVerification {...props} email={loginEmail} userType={loginUserType} onOTPVerified={handleOTPVerified} onResendOTP={() => sendOTP(loginEmail, loginUserType)} onCancel={() => setShowOTP(false)} autoSend={false} />
              )}
            </Stack.Screen>
          ) : showResetPassword ? (
            <Stack.Screen name="reset-password">
              {(props) => <ResetPasswordPage email={loginEmail} onSubmit={handlePasswordReset} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="login">
                {(props) => (
                  <LoginPage {...props} onLogin={(email, password, userType) => handleLogin(email, password, userType, props.navigation)} onForgotPassword={handleForgotPassword} onSwitchToRegister={() => props.navigation.navigate('register')} />
                )}
              </Stack.Screen>
              <Stack.Screen name="register">
                {(props) => (
                  <RegisterPage {...props} onRegister={(name, email, password, phone, userType) => handleRegister(name, email, password, phone, userType, props.navigation)} onSwitchToLogin={() => props.navigation.navigate('login')} />
                )}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}