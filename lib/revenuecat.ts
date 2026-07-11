/** ═══ MOCK / placeholder — replace with real RevenueCat + Supabase when MCP is connected ═══ */

import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-revenuecat';
import { storeSubscription } from './store';

const API_KEY = 'REVENUECAT_API_KEY_PLACEHOLDER'; // Replace with your RevenueCat API key

const ENTITLEMENT_ID = 'pro';

export async function initRevenueCat(userId?: string): Promise<void> {
  await Purchases.configure({
    apiKey: API_KEY,
    appUserID: userId,
  });
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(pkg: any): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  await syncSubscription(customerInfo);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  await syncSubscription(customerInfo);
  return customerInfo;
}

export async function checkProStatus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  await syncSubscription(customerInfo);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

async function syncSubscription(customerInfo: CustomerInfo): Promise<void> {
  const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  const expiration = customerInfo.entitlements.active[ENTITLEMENT_ID]?.expirationDate;

  await storeSubscription({
    type: isPro ? 'pro' : 'free',
    expiresAt: expiration ? new Date(expiration).getTime() : undefined,
  });
}

export function getProFeatures() {
  return {
    maxDevices: 2,          // Free: 2 devices
    proMaxDevices: Infinity, // Pro: unlimited
    remoteCasting: false,    // Free: same-network only
    proRemoteCasting: true,  // Pro: any network
    maxQuality: '720p',      // Free: 720p
    proMaxQuality: '4K',     // Pro: 4K
    guestInvites: false,     // Free: no guest invites
    proGuestInvites: true,   // Pro: can invite guests
    watchParty: false,       // Free: no watch party
    proWatchParty: true,     // Pro: watch party sync
  };
}
