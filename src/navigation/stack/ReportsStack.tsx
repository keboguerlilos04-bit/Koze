import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ReportsScreen from '@/screens/reports/ReportsScreen';

// Koze: the Reports tab, shown to administrators only.
export type ReportsStackParamList = {
  Reports: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export const ReportsStack = () => (
  <Stack.Navigator initialRouteName="Reports">
    <Stack.Screen options={{ headerShown: false }} name="Reports" component={ReportsScreen} />
  </Stack.Navigator>
);
