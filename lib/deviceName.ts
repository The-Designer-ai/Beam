import { Device } from '../types';

export function getDeviceDisplayName(device: Device): string {
  if (!device.ownerName) return device.name;

  const owner = device.ownerName.endsWith('s')
    ? `${device.ownerName}'`
    : `${device.ownerName}'s`;
  const genericName = /^(iphone|ipad|android device)$/i.test(device.name);

  return genericName ? `${owner} ${device.name}` : device.name;
}
