import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [experience, setExperience] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !license || !phone || !vehicleType || !vehicleNumber || !experience || !address) {
      setError('Please fill all required fields');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    // Validate experience is a number
    if (isNaN(experience) || parseInt(experience) < 0) {
      setError('Please enter valid years of experience');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const driverData = {
        name,
        license,
        phone,
        vehicleType,
        vehicleNumber,
        experience: parseInt(experience),
        address,
        role: 'driver',
        isActive: true,
        createdAt: new Date().toISOString(),
        status: 'offline'
      };

      await register(email, password, driverData);
      Alert.alert(
        'Success!',
        'Your driver account has been created successfully. You can now log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Join RapidAid</Text>
        <Text style={styles.subtitle}>Register as a Driver</Text>
      </View>
      
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+1234567890"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>License Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your license number"
            value={license}
            onChangeText={setLicense}
            autoCapitalize="characters"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Type *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Ambulance, Medical Van"
            value={vehicleType}
            onChangeText={setVehicleType}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter vehicle registration number"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Years of Experience *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter years of experience"
            value={experience}
            onChangeText={setExperience}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your complete address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a strong password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Driver Account</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#0A6CF1',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#374151',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#0A6CF1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0A6CF1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#0A6CF1',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B3B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});

