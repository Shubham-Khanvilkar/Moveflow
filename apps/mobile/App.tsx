import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

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
import BookingHistoryScreen from './src/screens/employee/BookingHistoryScreen';

// Driver Screens
import DriverHomeScreen from './src/screens/driver/DriverHomeScreen';

// Admin Screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import SupervisorDashboardScreen from './src/screens/admin/SupervisorDashboardScreen';

// Guard Screens
import GuardHomeScreen from './src/screens/guard/GuardHomeScreen';

const AuthStack = createNativeStackNavigator();
const EmployeeStack = createNativeStackNavigator();
const DriverStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: '#2563EB' },
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

function EmployeeNavigator() {
  return (
    <EmployeeStack.Navigator screenOptions={defaultScreenOptions}>
      <EmployeeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'MoveFlow' }}
      />
      <EmployeeStack.Screen
        name="BookRide"
        component={BookRideScreen}
        options={{ title: 'Book a Ride' }}
      />
      <EmployeeStack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: 'Track Ride' }}
      />
      <EmployeeStack.Screen
        name="EmployeeTracking"
        component={EmployeeTrackingScreen}
        options={{ title: 'Live Tracking' }}
      />
      <EmployeeStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <EmployeeStack.Screen
        name="Workplace"
        component={WorkplaceScreen}
        options={{ title: 'Workplace' }}
      />
      <EmployeeStack.Screen
        name="Sustainability"
        component={SustainabilityScreen}
        options={{ title: 'Sustainability' }}
      />
      <EmployeeStack.Screen
        name="BookingHistory"
        component={BookingHistoryScreen}
        options={{ title: 'Booking History' }}
      />
    </EmployeeStack.Navigator>
  );
}

function DriverNavigator() {
  return (
    <DriverStack.Navigator screenOptions={defaultScreenOptions}>
      <DriverStack.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: 'Driver Dashboard' }}
      />
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
    <AdminStack.Navigator screenOptions={defaultScreenOptions}>
      <AdminStack.Screen
        name="GuardHome"
        component={GuardHomeScreen}
        options={{ title: 'Guard Dashboard' }}
      />
    </AdminStack.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();

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
