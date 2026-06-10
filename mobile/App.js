import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const APP_URL = 'https://www.prouetds.com.tr';

export default function App() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const onBack = () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webRef}
        source={{ uri: APP_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        setSupportMultipleWindows={false}
        startInLoadingState
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack;
        }}
        renderLoading={() => (
          <View style={styles.loadingShell}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingTitle}>U-ETDS yükleniyor</Text>
            <Text style={styles.loadingText}>
              UETDS operasyon paneli hazırlanıyor.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5ef',
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f8f5ef',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  loadingText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
});
