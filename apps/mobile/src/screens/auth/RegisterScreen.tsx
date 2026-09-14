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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterScreenProps {
  navigation: any;
}

const COMPANIES = [
  { code: 'ACME001', name: 'Acme Enterprise', domain: 'acme.com' },
];

const ROLES = [
  { id: 'EMPLOYEE', name: 'Employee', icon: 'person' as const, color: '#2563EB' },
  { id: 'DRIVER', name: 'Driver', icon: 'car' as const, color: '#059669' },
];

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('EMPLOYEE');
  const [selectedCompany, setSelectedCompany] = useState('ACME001');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    const result = await register(name.trim(), email.trim(), password, selectedCompany);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join NAVIRA today</Text>
          </View>

          {/* Company Selection */}
          <View style={styles.companySection}>
            <Text style={styles.sectionLabel}>Company</Text>
            <View style={styles.companyButtons}>
              {COMPANIES.map((company) => (
                <TouchableOpacity
                  key={company.code}
                  style={[
                    styles.companyButton,
                    selectedCompany === company.code && styles.companyButtonActive,
                    { borderColor: selectedCompany === company.code ? '#2563EB' : '#E5E7EB' },
                  ]}
                  onPress={() => setSelectedCompany(company.code)}
                >
                  <Ionicons
                    name="business"
                    size={24}
                    color={selectedCompany === company.code ? '#2563EB' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.companyText,
                      selectedCompany === company.code && { color: '#2563EB' },
                    ]}
                  >
                    {company.name}
                  </Text>
                  {selectedCompany === company.code && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>I am a</Text>
            <View style={styles.roleButtons}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleButton,
                    selectedRole === role.id && styles.roleButtonActive,
                    { borderColor: selectedRole === role.id ? role.color : '#E5E7EB' },
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <Ionicons
                    name={role.icon}
                    size={24}
                    color={selectedRole === role.id ? role.color : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      selectedRole === role.id && { color: role.color },
                    ]}
                  >
                    {role.name}
                  </Text>
                  {selectedRole === role.id && (
                    <Ionicons name="checkmark-circle" size={20} color={role.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  companySection: {
    marginBottom: 24,
  },
  companyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  companyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  companyButtonActive: {
    backgroundColor: '#F9FAFB',
  },
  companyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  roleSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  roleButtonActive: {
    backgroundColor: '#F9FAFB',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  form: {
    marginBottom: 24,
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
  registerButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
});
