import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import MedicalProfile from '../screens/MedicalProfile';
import AmbulanceTracking from '../screens/AmbulanceTracking';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      onError={(error) => {
        console.error('Navigation Error:', error);
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={user ? 'Home' : 'Login'}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="MedicalProfile" component={MedicalProfile} />
            <Stack.Screen name="AmbulanceTracking" component={AmbulanceTracking} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
