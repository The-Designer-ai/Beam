// ───────────────────────────────────────────────────────────
// withBeamNearby — Expo Config Plugin
//
// Adds the required plist entries for Multipeer Connectivity:
//   - NSLocalNetworkUsageDescription (required by iOS 14+)
//   - NSBonjourServices (registers our service type)
//   - NSNearbyInteractionAllowOnceUsageDescription (just in case)
// ───────────────────────────────────────────────────────────

const { withInfoPlist } = require('expo/config-plugins');

function withBeamNearby(config) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults;

    // Required: Explain why we need local network access
    plist.NSLocalNetworkUsageDescription =
      'Beam uses the local network to discover nearby devices for sharing domains and casting without a server.';

    // Required: Register our Bonjour service type so iOS knows
    // we're looking for other Beam devices specifically
    plist.NSBonjourServices = plist.NSBonjourServices || [];
    if (!plist.NSBonjourServices.includes('_beam-domain._tcp')) {
      plist.NSBonjourServices.push('_beam-domain._tcp');
    }
    if (!plist.NSBonjourServices.includes('_beam-cast._tcp')) {
      plist.NSBonjourServices.push('_beam-cast._tcp');
    }

    // Optional but good practice: Nearby Interaction description
    // (only needed if we ever use U1 chip precise ranging)
    plist.NSNearbyInteractionAllowOnceUsageDescription =
      plist.NSNearbyInteractionAllowOnceUsageDescription ||
      'Beam can use nearby interaction to help locate devices for faster domain sharing.';

    return config;
  });
}

module.exports = withBeamNearby;
