import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import EmployeeHomeScreen from '../screens/employee/EmployeeHomeScreen';
import BookRideScreen from '../screens/BookRideScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import EmployeeScheduleScreen from '../screens/employee/EmployeeScheduleScreen';
import EmployeeAddressScreen from '../screens/employee/EmployeeAddressScreen';
import PickupDropHistoryScreen from '../screens/employee/PickupDropHistoryScreen';
import DriverTripDetailsScreen from '../screens/driver/DriverTripDetailsScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import EmployeeBookingScreen from '../screens/employee/EmployeeBookingScreen';
import GuardDutyScreen from '../screens/guard/GuardDutyScreen';
import GuardQRScannerScreen from '../screens/guard/GuardQRScannerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Schedule') iconName = focused ? 'calendar' : 'calendar-outline';
        else if (route.name === 'Book') iconName = focused ? 'car' : 'car-outline';
        else if (route.name === 'Addresses') iconName = focused ? 'location' : 'location-outline';
        else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#6B7280',
    })}>
      <Tab.Screen name="Home" component={EmployeeHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Schedule" component={EmployeeScheduleScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Book" component={EmployeeBookingScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Addresses" component={EmployeeAddressScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Trips') iconName = focused ? 'map' : 'map-outline';
        else if (route.name === 'Earnings') iconName = focused ? 'wallet' : 'wallet-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#6B7280',
    })}>
      <Tab.Screen name="Home" component={DriverHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Trips" component={DriverTripDetailsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Earnings" component={DriverEarningsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
        <Stack.Screen name="DriverTabs" component={DriverTabs} />
        <Stack.Screen name="GuardDuty" component={GuardDutyScreen} />
        <Stack.Screen name="GuardQRScanner" component={GuardQRScannerScreen} />
        <Stack.Screen name="PickupDropHistory" component={PickupDropHistoryScreen} />
        <Stack.Screen name="TripDetails" component={DriverTripDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
