import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
    className?: string;
    textClassName?: string;
    children: React.ReactNode;
}

export function Button({
    variant = 'default',
    size = 'default',
    isLoading = false,
    className,
    textClassName,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const variants = {
        default: 'bg-purple-600 active:bg-purple-700',
        outline: 'border border-gray-200 bg-white active:bg-gray-100',
        ghost: 'hover:bg-gray-100 active:bg-gray-100',
        destructive: 'bg-red-500 active:bg-red-600',
    };

    const textVariants = {
        default: 'text-white',
        outline: 'text-gray-900',
        ghost: 'text-gray-900',
        destructive: 'text-white',
    };

    const sizes = {
        default: 'h-12 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-14 rounded-md px-8',
        icon: 'h-10 w-10',
    };

    return (
        <TouchableOpacity
            className={cn(
                "items-center justify-center rounded-md font-medium disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#6b21a8' : 'white'} />
            ) : (
                <Text className={cn("text-base font-medium", textVariants[variant], textClassName)}>
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}
