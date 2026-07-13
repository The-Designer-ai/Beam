// ───────────────────────────────────────────────────────────
// lib/revenuecat.ts — RevenueCat SDK integration
// Official SDK: react-native-purchases + react-native-purchases-ui
// Products configured in RevenueCat dashboard:
//   - beam_pro_lifetime (lifetime)
//   - beam_pro_yearly   (annual)
//   - beam_pro_monthly  (monthly)
// Entitlement: Beam Pro
// ───────────────────────────────────────────────────────────

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { storeSubscription } from './store';

const API_KEY = 'test_KxgGlPAZWCvNcfEEGROZUnOaGpV';
const ENTITLEMENT_ID = 'Beam Pro';

// ─── Product identifiers (must match RevenueCat dashboard) ─
export const PRODUCT_IDS = {
  MONTHLY: 'beam_pro_monthly',
  YEARLY: 'beam_pro_yearly',
  LIFETIME: 'beam_pro_lifetime',
} as const;

// ─── Configure RevenueCat SDK ─────────────────────────────

export async function initRevenueCat(userId?: string): Promise<void> {
  Purchases.configure({
    apiKey: ***    appUserID: userId,
  });

  // Enable automatic paywall presentation
  await Purchases.setAttributes({
    platform: 'ios',
    framework: 'react-native',
  });
}

// ─── Fetch offerings (products from RevenueCat dashboard) ──

export async function getOfferings(): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
  currentOffering: PurchasesOffering | null;
}> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;

  return {
    monthly: current?.monthly ?? null,
    yearly: current?.annual ?? null,
    lifetime: current?.lifetime ?? null,
    currentOffering: current,
  };
}

// ─── Purchase a package ────────────────────────────────────

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ customerInfo: CustomerInfo; isPro: boolean }> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const isPro = await syncSubscription(customerInfo);
  return { customerInfo, isPro };
}

// ─── Restore purchases ─────────────────────────────────────

export async function restorePurchases(): Promise<{
  customerInfo: CustomerInfo;
  isPro: boolean;
}> {
  const customerInfo = await Purchases.restorePurchases();
  const isPro = await syncSubscription(customerInfo);
  return { customerInfo, isPro };
}

// ─── Check if user has active Pro entitlement ──────────────

export async function checkProStatus(): Promise<{
  isPro: boolean;
  customerInfo: CustomerInfo | null;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPro = await syncSubscription(customerInfo);
    return { isPro, customerInfo };
  } catch {
    return { isPro: false, customerInfo: null };
  }
}

// ─── Present RevenueCat hosted paywall ─────────────────────
// Uses RevenueCatUI from react-native-purchases-ui (v10+ API)

export async function presentPaywall(): Promise<boolean> {
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });
    if (result === 'PURCHASED' || result === 'RESTORED') {
      const info = await Purchases.getCustomerInfo();
      await syncSubscription(info);
      return true;
    }
    return false;
  } catch (error: any) {
    if (error?.userCancelled) {
      return false;
    }
    throw error;
  }
}

// ─── Present Customer Center (subscription management) ─────
// Native RevenueCat UI for managing subscription

export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}

// ─── Get customer info (detailed) ──────────────────────────

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

// ─── Get formatted pricing for display ─────────────────────

export function getPriceString(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

export function getIntroPriceString(pkg: PurchasesPackage): string | null {
  const discount = pkg.product.discounts?.[0];
  if (!discount) return null;
  return discount.priceString;
}

// ─── Log in (associate purchases with user) ────────────────

export async function logInRevenueCat(userId: string): Promise<{
  customerInfo: CustomerInfo;
  created: boolean;
}> {
  const result = await Purchases.logIn(userId);
  return result;
}

// ─── Log out ───────────────────────────────────────────────

export async function logOutRevenueCat(): Promise<CustomerInfo> {
  return await Purchases.logOut();
}

// ─── Internal: sync RevenueCat state to local storage ─────

async function syncSubscription(customerInfo: CustomerInfo): Promise<boolean> {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const isPro = entitlement !== undefined;

  await storeSubscription({
    type: isPro ? 'pro' : 'free',
    expiresAt: entitlement?.expirationDate
      ? new Date(entitlement.expirationDate).getTime()
      : undefined,
    productIdentifier: entitlement?.productIdentifier,
    latestPurchaseDate: entitlement?.latestPurchaseDate,
  });

  return isPro;
}

// ─── Types ─────────────────────────────────────────────────

export type { CustomerInfo, PurchasesPackage, PurchasesOffering };
