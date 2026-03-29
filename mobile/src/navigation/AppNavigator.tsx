import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import TripsScreen from '../screens/TripsScreen';
import TripDetailScreen from '../screens/TripDetailScreen';
import { COLORS } from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'fade_from_bottom'
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Trips" component={TripsScreen} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
