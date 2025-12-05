import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardScreen() {
    const { logout, user, employee, vendor } = useAuth();

    const currentUser = user || employee || vendor;
    const role = user ? 'Owner' : employee ? 'Employee' : 'Vendor';

    const getName = () => {
        if (user) return user.name;
        if (employee) return employee.name;
        if (vendor) return vendor.tailorName;
        return 'User';
    };

    return (
        <View className="flex-1 items-center justify-center bg-white p-4">
            <Text className="text-2xl font-bold mb-4">Dashboard</Text>
            <Text className="text-lg mb-2">Welcome, {getName()}</Text>
            <Text className="text-base text-gray-500 mb-8">Role: {role}</Text>

            <Button onPress={logout} variant="destructive" className="w-full max-w-xs">
                Logout
            </Button>
        </View>
    );
}
