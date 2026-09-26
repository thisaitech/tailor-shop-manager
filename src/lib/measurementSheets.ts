import { TShirt, Pants, Hoodie, Dress, CoatHanger, Scissors, Baby, Sneaker } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export type GarmentIconKey =
  | 'tshirt'
  | 'pants'
  | 'hoodie'
  | 'dress'
  | 'hanger'
  | 'scissors'
  | 'baby'
  | 'sneaker';

export type GarmentFieldConfig = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

export type CustomGarmentType = {
  key: string;
  label: string;
  category?: 'male' | 'female' | 'kids';
  iconKey?: GarmentIconKey;
};

export type CustomMeasurementFieldsMap = Record<string, GarmentFieldConfig[]>;

export type BuiltInCategoryConfig = {
  label: string;
  icon: Icon;
  iconKey: GarmentIconKey;
  fields: GarmentFieldConfig[];
};

export const GARMENT_ICON_OPTIONS: { key: GarmentIconKey; label: string; icon: Icon }[] = [
  { key: 'tshirt', label: 'Shirt', icon: TShirt },
  { key: 'pants', label: 'Pant', icon: Pants },
  { key: 'hoodie', label: 'Coat / Jacket', icon: Hoodie },
  { key: 'dress', label: 'Dress / Blouse', icon: Dress },
  { key: 'hanger', label: 'Hanger', icon: CoatHanger },
  { key: 'scissors', label: 'Tailor', icon: Scissors },
  { key: 'baby', label: 'Kids', icon: Baby },
  { key: 'sneaker', label: 'Accessories', icon: Sneaker },
];

const ICON_BY_KEY: Record<GarmentIconKey, Icon> = {
  tshirt: TShirt,
  pants: Pants,
  hoodie: Hoodie,
  dress: Dress,
  hanger: CoatHanger,
  scissors: Scissors,
  baby: Baby,
  sneaker: Sneaker,
};

export function getGarmentIcon(iconKey?: GarmentIconKey | string | null): Icon {
  if (iconKey && iconKey in ICON_BY_KEY) {
    return ICON_BY_KEY[iconKey as GarmentIconKey];
  }
  return CoatHanger;
}

/** Guess a garment icon from a dress-type name */
export function guessGarmentIconKey(label: string, key = ''): GarmentIconKey {
  const text = `${label} ${key}`.toLowerCase();
  if (/(pant|trouser|chudi|churidar|chudithar|salwar|pyjama|pajama)/.test(text)) return 'pants';
  if (/(shirt|tshirt|tee|kurta|top)/.test(text)) return 'tshirt';
  if (/(coat|blazer|jacket|hoodie|suit|overcoat)/.test(text)) return 'hoodie';
  if (/(blouse|frock|gown|lehenga|saree|sari|dress|skirt|anarkali)/.test(text)) return 'dress';
  if (/(kid|baby|child|boys|girls)/.test(text)) return 'baby';
  if (/(shoe|sneaker|belt|access)/.test(text)) return 'sneaker';
  if (/(cut|tailor|stitch)/.test(text)) return 'scissors';
  return 'hanger';
}

export function resolveGarmentIconKey(options: {
  key: string;
  label: string;
  storedIconKey?: GarmentIconKey | string | null;
  overrideIconKey?: GarmentIconKey | string | null;
}): GarmentIconKey {
  if (options.overrideIconKey && options.overrideIconKey in ICON_BY_KEY) {
    return options.overrideIconKey as GarmentIconKey;
  }
  if (options.storedIconKey && options.storedIconKey in ICON_BY_KEY) {
    return options.storedIconKey as GarmentIconKey;
  }
  const builtin = CUSTOMER_BUILTIN_CATEGORIES[options.key];
  if (builtin?.iconKey) return builtin.iconKey;
  return guessGarmentIconKey(options.label, options.key);
}

export const CUSTOM_GARMENTS_STORAGE_KEY = 'custom_garment_types';
export const CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY = 'custom_measurement_fields';
export const SHEET_OVERRIDES_STORAGE_KEY = 'measurement_sheet_overrides';

/** Renames / hides for built-in (and any) dress types & fields — shared by Customer + Service Order */
export type SheetOverrides = {
  hiddenCategories: string[];
  categoryLabels: Record<string, string>;
  categoryIcons: Record<string, GarmentIconKey>;
  hiddenFields: Record<string, string[]>;
  fieldLabels: Record<string, Record<string, string>>;
};

const EMPTY_OVERRIDES: SheetOverrides = {
  hiddenCategories: [],
  categoryLabels: {},
  categoryIcons: {},
  hiddenFields: {},
  fieldLabels: {},
};

export function loadSheetOverrides(): SheetOverrides {
  try {
    const raw = localStorage.getItem(SHEET_OVERRIDES_STORAGE_KEY);
    if (!raw) {
      return {
        hiddenCategories: [],
        categoryLabels: {},
        categoryIcons: {},
        hiddenFields: {},
        fieldLabels: {},
      };
    }
    const parsed = JSON.parse(raw);
    return {
      hiddenCategories: Array.isArray(parsed?.hiddenCategories) ? parsed.hiddenCategories : [],
      categoryLabels: parsed?.categoryLabels && typeof parsed.categoryLabels === 'object' ? parsed.categoryLabels : {},
      categoryIcons: parsed?.categoryIcons && typeof parsed.categoryIcons === 'object' ? parsed.categoryIcons : {},
      hiddenFields: parsed?.hiddenFields && typeof parsed.hiddenFields === 'object' ? parsed.hiddenFields : {},
      fieldLabels: parsed?.fieldLabels && typeof parsed.fieldLabels === 'object' ? parsed.fieldLabels : {},
    };
  } catch {
    return {
      hiddenCategories: [],
      categoryLabels: {},
      categoryIcons: {},
      hiddenFields: {},
      fieldLabels: {},
    };
  }
}

export function saveSheetOverrides(overrides: SheetOverrides) {
  try {
    localStorage.setItem(SHEET_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

export function applyCategoryLabel(key: string, defaultLabel: string, overrides: SheetOverrides): string {
  return overrides.categoryLabels[key] || defaultLabel;
}

export function applyFieldLabels(
  categoryKey: string,
  fields: GarmentFieldConfig[],
  overrides: SheetOverrides
): GarmentFieldConfig[] {
  const hidden = new Set(overrides.hiddenFields[categoryKey] || []);
  const labels = overrides.fieldLabels[categoryKey] || {};
  return fields
    .filter((f) => !hidden.has(f.key))
    .map((f) => (labels[f.key] ? { ...f, label: labels[f.key] } : f));
}

export function isCategoryHidden(key: string, overrides: SheetOverrides): boolean {
  return overrides.hiddenCategories.includes(key);
}

/** Blouse / Custom Dress paper sheet (Pics 2 & 3) */
export const BLOUSE_STYLE_FIELDS: GarmentFieldConfig[] = [
  { key: 'frontNeck', label: 'Front Neck', type: 'number' },
  { key: 'backNeck', label: 'Back Neck', type: 'number' },
  { key: 'shoulder', label: 'Shoulder', type: 'number' },
  { key: 'sleeveLength', label: 'Sleeve Length', type: 'number' },
  { key: 'sleeveWidth', label: 'Sleeve Width', type: 'number' },
  { key: 'armhole', label: 'Armhole', type: 'number' },
  { key: 'chest', label: 'Chest', type: 'number' },
  { key: 'waist', label: 'Waist', type: 'number' },
  { key: 'frontDrop', label: 'Front Drop', type: 'number' },
  { key: 'backDrop', label: 'Back Drop', type: 'number' },
  { key: 'topHeight', label: 'Top Height', type: 'number' },
  { key: 'bodyHeight', label: 'Body Height', type: 'number' },
  { key: 'totalHeight', label: 'Total Height', type: 'number' },
  { key: 'skirtWaist', label: 'Petticoat/Skirt Waist', type: 'number' },
  { key: 'skirtHeight', label: 'Petticoat/Skirt Height', type: 'number' },
  { key: 'yoke', label: 'Yoke', type: 'number' },
  { key: 'measurementBlouse', label: 'Measurement Blouse', type: 'text' },
];

/** Chudithar / Cudidar paper sheet (Pic 4) */
export const CHUDITHAR_FIELDS: GarmentFieldConfig[] = [
  { key: 'frontNeck', label: 'Front Neck', type: 'number' },
  { key: 'backNeck', label: 'Back Neck', type: 'number' },
  { key: 'height', label: 'Height/Length', type: 'number' },
  { key: 'sleeveOpening', label: 'Sleeve Opening', type: 'number' },
  { key: 'shoulder', label: 'Shoulder', type: 'number' },
  { key: 'sleeveLength', label: 'Sleeve Length', type: 'number' },
  { key: 'sleeveWidth', label: 'Sleeve Width', type: 'number' },
  { key: 'armhole', label: 'Armhole', type: 'number' },
  { key: 'chest', label: 'Chest', type: 'number' },
  { key: 'waist', label: 'Waist', type: 'number' },
  { key: 'seat', label: 'Seat/Hip', type: 'number' },
  { key: 'bottomHeight', label: 'Bottom Height', type: 'number' },
  { key: 'legLoose', label: 'Leg Loose', type: 'number' },
  { key: 'thighLoose', label: 'Thigh Loose', type: 'number' },
  { key: 'kneeLoose', label: 'Knee Loose', type: 'number' },
  { key: 'legYesNo', label: 'Leg Yes/No', type: 'select', options: ['Yes', 'No'] },
];

export const DEFAULT_CUSTOM_MEASUREMENT_FIELDS: GarmentFieldConfig[] = [
  { key: 'chest', label: 'Chest', type: 'number' },
  { key: 'waist', label: 'Waist', type: 'number' },
  { key: 'length', label: 'Length', type: 'number' },
  { key: 'shoulder', label: 'Shoulder', type: 'number' },
  { key: 'hip', label: 'Hip', type: 'number' },
];

/** Built-in categories shown on Create Customer measurements */
export const CUSTOMER_BUILTIN_CATEGORIES: Record<string, BuiltInCategoryConfig> = {
  shirt: {
    label: 'Shirt',
    icon: TShirt,
    iconKey: 'tshirt',
    fields: [
      { key: 'chest', label: 'Chest', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
    ],
  },
  pant: {
    label: 'Pant',
    icon: Pants,
    iconKey: 'pants',
    fields: [
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'inseam', label: 'Inseam', type: 'number' },
      { key: 'outseam', label: 'Outseam', type: 'number' },
      { key: 'thigh', label: 'Thigh', type: 'number' },
      { key: 'hips', label: 'Hips', type: 'number' },
      { key: 'legOpening', label: 'Leg Opening', type: 'number' },
    ],
  },
  coat: {
    label: 'Coat',
    icon: Hoodie,
    iconKey: 'hoodie',
    fields: [
      { key: 'chest', label: 'Chest', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
    ],
  },
  blouse: {
    label: 'Blouse',
    icon: Dress,
    iconKey: 'dress',
    fields: BLOUSE_STYLE_FIELDS,
  },
  chudithar: {
    label: 'Chudithar',
    icon: Pants,
    iconKey: 'pants',
    fields: CHUDITHAR_FIELDS,
  },
  customDress: {
    label: 'Custom Dress',
    icon: CoatHanger,
    iconKey: 'hanger',
    fields: BLOUSE_STYLE_FIELDS,
  },
};

export const BUILTIN_CATEGORY_KEYS = new Set(Object.keys(CUSTOMER_BUILTIN_CATEGORIES));

export function isBuiltInCategory(key: string): boolean {
  return BUILTIN_CATEGORY_KEYS.has(key);
}

export function loadCustomGarmentTypes(): CustomGarmentType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_GARMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomGarmentTypes(garments: CustomGarmentType[]) {
  try {
    localStorage.setItem(CUSTOM_GARMENTS_STORAGE_KEY, JSON.stringify(garments));
  } catch {
    // ignore
  }
}

export function loadCustomMeasurementFields(): CustomMeasurementFieldsMap {
  try {
    const raw = localStorage.getItem(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCustomMeasurementFields(fields: CustomMeasurementFieldsMap) {
  try {
    localStorage.setItem(CUSTOM_MEASUREMENT_FIELDS_STORAGE_KEY, JSON.stringify(fields));
  } catch {
    // ignore
  }
}

export function slugifyKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return base || 'custom_' + Date.now();
}

export function mergeFieldsWithCustom(
  baseFields: readonly GarmentFieldConfig[] | GarmentFieldConfig[],
  categoryKey: string,
  customMeasurementFields: CustomMeasurementFieldsMap
): GarmentFieldConfig[] {
  const extraFields = customMeasurementFields[categoryKey] || [];
  if (extraFields.length === 0) return [...baseFields];
  const existingKeys = new Set(baseFields.map((f) => f.key));
  const mergedExtras = extraFields.filter((f) => !existingKeys.has(f.key));
  return [...baseFields, ...mergedExtras];
}

export function getCustomFieldKeys(
  categoryKey: string,
  customMeasurementFields: CustomMeasurementFieldsMap
): Set<string> {
  return new Set((customMeasurementFields[categoryKey] || []).map((f) => f.key));
}
