import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    className?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <View className="space-y-2">
            {label && (
                <Text className="text-sm font-medium text-gray-700">
                    {label}
                </Text>
            )}
            <TextInput
                className={cn(
                    "flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-red-500",
                    className
                )}
                placeholderTextColor="#9ca3af"
                {...props}
            />
            {error && (
                <Text className="text-sm text-red-500">
                    {error}
                </Text>
            )}
        </View>
    );
}
