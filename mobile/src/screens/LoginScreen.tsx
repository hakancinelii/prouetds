import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Alert
} from 'react-native';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState(''); // TC No or Email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation: any = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      const { accessToken, user } = res.data;

      // Store token safely
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      // Navigate to Home/Trips
      navigation.replace('Trips');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header / Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ShieldCheck size={48} color={COLORS.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Pro<Text style={{color: COLORS.primary}}>UETDS</Text></SaaS></Text>
          <Text style={styles.subtitle}>Şoför Yönetim Paneli</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <User size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="E-posta veya TC Kimlik"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sisteme Giriş Yap</Text>
                <ArrowRight size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ProUETDS v1.0.0 © 2026</Text>
          <Text style={styles.footerSubText}>TC KDGM Güvenli Entegrasyon</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '500',
    opacity: 0.8,
  },
  form: {
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  footerSubText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  }
});
