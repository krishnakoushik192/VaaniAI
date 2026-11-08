/**
 * Vaani — voice-first billing and Khata for kirana shops.
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Route, RouterProvider } from './src/navigation/Router';
import { AddCustomerScreen } from './src/screens/AddCustomerScreen';
import { BillReviewScreen } from './src/screens/BillReviewScreen';
import { CashConfirmScreen } from './src/screens/CashConfirmScreen';
import { CustomerDetailScreen } from './src/screens/CustomerDetailScreen';
import { EditItemsScreen } from './src/screens/EditItemsScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { KhataScreen } from './src/screens/KhataScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PaymentQRScreen } from './src/screens/PaymentQRScreen';
import { RecordPaymentScreen } from './src/screens/RecordPaymentScreen';
import { RecorderScreen } from './src/screens/RecorderScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AppStoreProvider, useStore } from './src/store/AppStore';
import { ThemeProvider, useTheme } from './src/theme';
import { LoadingState } from './src/components/Feedback';

function renderRoute(route: Route) {
  switch (route.name) {
    case 'tabs':
      return route.tab === 'khata' ? <KhataScreen /> : route.tab === 'history' ? <HistoryScreen /> : <HomeScreen />;
    case 'recorder':
      return <RecorderScreen />;
    case 'review':
      return <BillReviewScreen draft={route.draft} />;
    case 'editItems':
      return <EditItemsScreen draft={route.draft} fromReview={route.fromReview} />;
    case 'payment':
      return <PaymentQRScreen draft={route.draft} total={route.total} />;
    case 'cashConfirm':
      return <CashConfirmScreen draft={route.draft} total={route.total} />;
    case 'result':
      return <ResultScreen kind={route.kind} amount={route.amount} customerId={route.customerId} method={route.method} />;
    case 'customer':
      return <CustomerDetailScreen id={route.id} />;
    case 'addCustomer':
      return <AddCustomerScreen />;
    case 'recordPayment':
      return <RecordPaymentScreen customerId={route.customerId} />;
    case 'settings':
      return <SettingsScreen />;
    case 'editProfile':
      return <EditProfileScreen />;
    case 'help':
      return <HelpScreen />;
  }
}

/** Start-up → choose language (first run) → log in → the app. */
function Root() {
  const { isDark } = useTheme();
  const { state } = useStore();
  const screen = !state.booted ? (
    <LoadingState />
  ) : !state.onboarded ? (
    <WelcomeScreen />
  ) : !state.token ? (
    <LoginScreen />
  ) : (
    // key: a new login starts with a fresh navigation stack
    <RouterProvider key={state.shop?.id ?? 'app'} render={renderRoute} />
  );
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {screen}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStoreProvider>
          <Root />
        </AppStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
