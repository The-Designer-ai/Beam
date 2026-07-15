import { DynamicColorIOS, Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { colors } from '../../lib/theme';
import { canUseLiquidGlass } from '../../components/LiquidGlassButton';

const defaultTabColor = Platform.OS === 'ios'
  ? DynamicColorIOS({ light: colors.textTertiary, dark: '#A1A1A6' })
  : colors.textTertiary;

const selectedTabColor = Platform.OS === 'ios'
  ? DynamicColorIOS({ light: colors.primary, dark: '#5AC8FA' })
  : colors.primary;

export default function TabLayout() {
  const liquidGlassEnabled = canUseLiquidGlass();
  const fallbackTabBackground = Platform.OS === 'ios'
    ? DynamicColorIOS({ light: colors.bgSecondary, dark: '#1C1C1E' })
    : colors.bgSecondary;

  return (
    <NativeTabs
      backgroundColor={liquidGlassEnabled ? undefined : fallbackTabBackground}
      blurEffect={liquidGlassEnabled ? 'systemDefault' : 'none'}
      disableTransparentOnScrollEdge={!liquidGlassEnabled}
      minimizeBehavior="never"
      tintColor={selectedTabColor}
      iconColor={{ default: defaultTabColor, selected: selectedTabColor }}
      labelStyle={{
        default: { color: defaultTabColor, fontSize: 11 },
        selected: { color: selectedTabColor, fontSize: 11, fontWeight: '600' },
      }}
    >
      <NativeTabs.Trigger name="devices">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'iphone', selected: 'iphone' }}
          md={{ default: 'phone_iphone', selected: 'phone_iphone' }}
        />
        <NativeTabs.Trigger.Label>Devices</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cast">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'airplayvideo', selected: 'airplayvideo' }}
          md={{ default: 'cast', selected: 'cast' }}
        />
        <NativeTabs.Trigger.Label>Cast</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="watch">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'tv', selected: 'tv.fill' }}
          md={{ default: 'tv', selected: 'tv' }}
        />
        <NativeTabs.Trigger.Label>Watch</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md={{ default: 'settings', selected: 'settings' }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
