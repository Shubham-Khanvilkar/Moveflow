import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { biometricAuth } from './src/services/biometric-auth';
import { offlineManager } from './src/services/offline-manager';
import { crashReporter } from './src/services/crash-reporter';
import { pushNotificationService } from './src/services/notifications';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Employee Screens
import HomeScreen from './src/screens/HomeScreen';
import BookRideScreen from './src/screens/BookRideScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkplaceScreen from './src/screens/WorkplaceScreen';
import SustainabilityScreen from './src/screens/SustainabilityScreen';
import EmployeeTrackingScreen from './src/screens/employee/EmployeeTrackingScreen';
import EmployeeBookingScreen from './src/screens/employee/EmployeeBookingScreen';
import EmployeeScheduleScreen from './src/screens/employee/EmployeeScheduleScreen';
import EmployeeAddressScreen from './src/screens/employee/EmployeeAddressScreen';
import BookingHistoryScreen from './src/screens/employee/BookingHistoryScreen';
import PickupDropHistoryScreen from './src/screens/employee/PickupDropHistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Driver Screens
import DriverHomeScreen from './src/screens/driver/DriverHomeScreen';
import DriverTripDetailsScreen from './src/screens/driver/DriverTripDetailsScreen';
import DriverEarningsScreen from './src/screens/driver/DriverEarningsScreen';
import DriverOnboardingScreen from './src/screens/driver/DriverOnboardingScreen';
import DocumentUploadScreen from './src/screens/driver/DocumentUploadScreen';

// Admin Screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import SupervisorDashboardScreen from './src/screens/admin/SupervisorDashboardScreen';

// Guard Screens
import GuardHomeScreen from './src/screens/guard/GuardHomeScreen';
import GuardDutyScreen from './src/screens/guard/GuardDutyScreen';
import GuardQRScannerScreen from './src/screens/guard/GuardQRScannerScreen';

const AuthStack = createNativeStackNavigator();
const EmployeeStack = createNativeStackNavigator();
const DriverStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
const GuardStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const EmployeeTab = createBottomTabNavigator();
const DriverTab = createBottomTabNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: '#2563EB' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

const driverScreenOptions = {
  headerStyle: { backgroundColor: '#D97706' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

const guardScreenOptions = {
  headerStyle: { backgroundColor: '#B45309' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={defaultScreenOptions}>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
    </AuthStack.Navigator>
  );
}

function EmployeeTabNavigator() {
  return (
    <EmployeeTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Book') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Tracking') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      })}
    >
      <EmployeeTab.Screen name="Home" component={HomeScreen} />
      <EmployeeTab.Screen name="Book" component={BookRideScreen} options={{ title: 'Book Ride' }} />
      <EmployeeTab.Screen name="Tracking" component={TrackingScreen} />
      <EmployeeTab.Screen name="History" component={BookingHistoryScreen} options={{ title: 'History' }} />
      <EmployeeTab.Screen name="Profile" component={ProfileScreen} />
    </EmployeeTab.Navigator>
  );
}

function EmployeeNavigator() {
  return (
    <EmployeeStack.Navigator screenOptions={defaultScreenOptions}>
      <EmployeeStack.Screen
        name="EmployeeTabs"
        component={EmployeeTabNavigator}
        options={{ headerShown: false }}
      />
      <EmployeeStack.Screen name="Workplace" component={WorkplaceScreen} options={{ title: 'Workplace' }} />
      <EmployeeStack.Screen name="Sustainability" component={SustainabilityScreen} options={{ title: 'Sustainability' }} />
      <EmployeeStack.Screen name="EmployeeTracking" component={EmployeeTrackingScreen} options={{ title: 'Live Tracking' }} />
      <EmployeeStack.Screen name="EmployeeBooking" component={EmployeeBookingScreen} options={{ title: 'Book Transport' }} />
      <EmployeeStack.Screen name="EmployeeSchedule" component={EmployeeScheduleScreen} options={{ title: 'Schedule' }} />
      <EmployeeStack.Screen name="EmployeeAddress" component={EmployeeAddressScreen} options={{ title: 'Addresses' }} />
      <EmployeeStack.Screen name="PickupDropHistory" component={PickupDropHistoryScreen} options={{ title: 'Pickup/Drop History' }} />
      <EmployeeStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </EmployeeStack.Navigator>
  );
}

function DriverTabNavigator() {
  return (
    <DriverTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Trips') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Earnings') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      })}
    >
      <DriverTab.Screen name="Dashboard" component={DriverHomeScreen} />
      <DriverTab.Screen name="Trips" component={DriverTripDetailsScreen} />
      <DriverTab.Screen name="Earnings" component={DriverEarningsScreen} />
      <DriverTab.Screen name="Profile" component={ProfileScreen} />
    </DriverTab.Navigator>
  );
}

function DriverNavigator() {
  return (
    <DriverStack.Navigator screenOptions={driverScreenOptions}>
      <DriverStack.Screen
        name="DriverTabs"
        component={DriverTabNavigator}
        options={{ headerShown: false }}
      />
      <DriverStack.Screen name="TripDetails" component={DriverTripDetailsScreen} options={{ title: 'Trip Details' }} />
      <DriverStack.Screen name="DriverOnboarding" component={DriverOnboardingScreen} options={{ title: 'Onboarding' }} />
      <DriverStack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ title: 'Upload Documents' }} />
      <DriverStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </DriverStack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={defaultScreenOptions}>
      <AdminStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin Console' }}
      />
      <AdminStack.Screen
        name="SupervisorDashboard"
        component={SupervisorDashboardScreen}
        options={{ title: 'Team Management' }}
      />
    </AdminStack.Navigator>
  );
}

function GuardNavigator() {
  return (
    <GuardStack.Navigator screenOptions={guardScreenOptions}>
      <GuardStack.Screen
        name="GuardHome"
        component={GuardHomeScreen}
        options={{ title: 'Guard Dashboard' }}
      />
      <GuardStack.Screen
        name="GuardDuty"
        component={GuardDutyScreen}
        options={{ title: 'Duty Log' }}
      />
      <GuardStack.Screen
        name="QRScanner"
        component={GuardQRScannerScreen}
        options={{ title: 'Scan QR Code' }}
      />
    </GuardStack.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    biometricAuth.initialize();
    offlineManager.initialize();
    pushNotificationService.initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const getInitialRouteName = () => {
    if (!isAuthenticated || !user) return 'Auth';
    switch ((user.activeRole || '').toUpperCase()) {
      case 'DRIVER':
        return 'Driver';
      case 'SUPER_ADMIN':
      case 'COMPANY_ADMIN':
      case 'TRANSPORT_ADMIN':
      case 'TRANSPORT_COORDINATOR':
      case 'COORDINATOR':
      case 'MANAGER':
      case 'TEAM_LEADER':
      case 'ASSISTANT_MANAGER':
      case 'SENIOR_MANAGER':
        return 'Admin';
      case 'GUARD':
        return 'Guard';
      default:
        return 'Employee';
    }
  };

  return (
    <RootStack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="Employee" component={EmployeeNavigator} />
      <RootStack.Screen name="Driver" component={DriverNavigator} />
      <RootStack.Screen name="Admin" component={AdminNavigator} />
      <RootStack.Screen name="Guard" component={GuardNavigator} />
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
