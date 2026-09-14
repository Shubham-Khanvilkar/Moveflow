import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Please try again');
    }
  };

  const handleDemoLogin = async (role: string) => {
    const demoAccounts: Record<string, { email: string; password: string }> = {
      employee: { email: 'priya@acme.com', password: 'Admin@123' },
      driver: { email: 'driver1@acme.com', password: 'Admin@123' },
      admin: { email: 'admin@acme.com', password: 'Admin@123' },
      guard: { email: 'guard@acme.com', password: 'Admin@123' },
    };

    const account = demoAccounts[role];
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
      setIsLoading(true);
      const result = await login(account.email, account.password);
      setIsLoading(false);
      if (!result.success) {
        Alert.alert('Demo Login Failed', result.error || 'Try again');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="car" size={48} color="#2563EB" />
            </View>
            <Text style={styles.title}>NAVIRA</Text>
            <Text style={styles.subtitle}>Intelligent Enterprise Mobility</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo Accounts */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Demo Access</Text>
            <View style={styles.demoButtons}>
              <TouchableOpacity
                style={[styles.demoBtn, { backgroundColor: '#EFF6FF' }]}
                onPress={() => handleDemoLogin('employee')}
                disabled={isLoading}
              >
                <Ionicons name="person" size={20} color="#2563EB" />
                <Text style={[styles.demoBtnText, { color: '#2563EB' }]}>Employee</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { backgroundColor: '#ECFDF5' }]}
                onPress={() => handleDemoLogin('driver')}
                disabled={isLoading}
              >
                <Ionicons name="car" size={20} color="#059669" />
                <Text style={[styles.demoBtnText, { color: '#059669' }]}>Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { backgroundColor: '#FEF3C7' }]}
                onPress={() => handleDemoLogin('admin')}
                disabled={isLoading}
              >
                <Ionicons name="shield" size={20} color="#D97706" />
                <Text style={[styles.demoBtnText, { color: '#D97706' }]}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { backgroundColor: '#FCE7F3' }]}
                onPress={() => handleDemoLogin('guard')}
                disabled={isLoading}
              >
                <Ionicons name="shield-checkmark" size={20} color="#EC4899" />
                <Text style={[styles.demoBtnText, { color: '#EC4899' }]}>Guard</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#111827',
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoSection: {
    marginBottom: 32,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  demoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
});
