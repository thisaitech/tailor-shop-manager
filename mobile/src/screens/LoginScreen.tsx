import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scissors, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen({ navigation }: any) {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter phone number and password');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(username, password);
            console.log('[LoginScreen] Login result:', result);

            if (result.success) {
                if (result.needsPasswordSetup) {
                    Alert.alert('Password Setup Needed', 'Please contact admin to setup password or use web version for first time setup.');
                } else {
                    // Navigation handled by AppNavigator
                }
            } else {
                Alert.alert('Login Failed', result.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-purple-50"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
                <View className="bg-white p-6 rounded-xl shadow-lg border border-purple-100">
                    <View className="items-center mb-8 space-y-4">
                        <View className="bg-purple-600 p-4 rounded-xl shadow-md mb-4">
                            <Scissors size={48} color="white" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 text-center">
                            Thisai Technologies Tailor
                        </Text>
                        <Text className="text-base text-gray-600 text-center">
                            Management System
                        </Text>
                    </View>

                    <View className="space-y-4">
                        <Input
                            label="Phone Number"
                            placeholder="Enter your phone number"
                            value={username}
                            onChangeText={setUsername}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />

                        <View>
                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-10"
                            >
                                {showPassword ? (
                                    <EyeOff size={20} color="#6b7280" />
                                ) : (
                                    <Eye size={20} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <Button
                            onPress={handleLogin}
                            isLoading={isLoading}
                            className="mt-4"
                        >
                            Login
                        </Button>
                    </View>

                    <View className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex-row items-start space-x-2">
                        <Text className="text-sm text-purple-900 flex-1">
                            <Text className="font-bold">Password Recovery: </Text>
                            For password reset, please contact your administrator via WhatsApp.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
