import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, typography, tabBar } from '../../lib/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    devices: '📱',
    cast: '📡',
    watch: '📺',
    settings: '⚙️',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name] || '●'}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={tabBar.glassBlur}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { ...typography.caption2, marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ focused }) => <TabIcon name="devices" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cast"
        options={{
          title: 'Cast',
          tabBarIcon: ({ focused }) => <TabIcon name="cast" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          tabBarIcon: ({ focused }) => <TabIcon name="watch" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: `rgba(255, 255, 255, ${tabBar.backgroundOpacity})`,
    borderTopWidth: 0,
    height: tabBar.height,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
