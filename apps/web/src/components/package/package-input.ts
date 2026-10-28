import type { PackageInput } from '../../types/package.types';

export const normalizePackagePrice = (value: string) => {
  const [whole, fraction = ''] = value.trim().split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
};
export const packageInputFromForm = (form: HTMLFormElement): PackageInput => {
  const data = new FormData(form);
  return { package_name: String(data.get('package_name')).trim(), duration_days: Number(data.get('duration_days')),
    price: normalizePackagePrice(String(data.get('price'))), description: String(data.get('description') || '') || null };
};
export const changedPackageFields = (input: PackageInput, baseline: Partial<PackageInput>): Partial<PackageInput> =>
  Object.fromEntries(Object.entries(input).filter(([key, value]) => baseline[key as keyof PackageInput] !== value));
