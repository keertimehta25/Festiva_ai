import type { VendorRecord } from '@shared/types';
import type { SelectOption } from '../../components/ui/FormControls';

/** Select options for linking a task or expense to a vendor, with a first "no vendor" choice. */
export function vendorOptions(vendors: VendorRecord[], noneLabel: string): SelectOption[] {
  return [{ value: '', label: noneLabel }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))];
}
