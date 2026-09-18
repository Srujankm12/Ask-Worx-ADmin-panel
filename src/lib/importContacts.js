export const SKIP_FIELD = '__skip__';

export const CONTACT_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone', required: true },
  { value: 'company', label: 'Company' },
];

export const MAPPING_OPTIONS = [{ value: SKIP_FIELD, label: "Don't import" }, ...CONTACT_FIELDS];

const FIELD_ALIASES = {
  name: ['name', 'full name', 'contact name', 'customer name'],
  phone: [
    'phone',
    'phone number',
    'mobile',
    'mobile number',
    'contact number',
    'whatsapp number',
    'whatsapp',
  ],
  company: ['company', 'company name', 'organization', 'organisation', 'business name'],
};

const normalizeHeader = (header) =>
  (header ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

/** Suggest a Contact field for each imported column header, or SKIP_FIELD. */
export function suggestMapping(columns) {
  const used = new Set();
  return columns.map((column) => {
    const normalized = normalizeHeader(column);
    const match = CONTACT_FIELDS.find(
      (field) => !used.has(field.value) && FIELD_ALIASES[field.value].includes(normalized),
    );
    if (match) {
      used.add(match.value);
      return match.value;
    }
    return SKIP_FIELD;
  });
}

/** Digits only — the manual form asks for "country code first, no plus sign or spaces". */
export function normalizePhone(raw) {
  return (raw ?? '').toString().replace(/\D/g, '');
}

export function isValidPhone(raw) {
  const digits = normalizePhone(raw);
  return digits.length >= 8 && digits.length <= 15;
}

export function buildImportRows({ rows, mapping, existingPhones = [], overrides = {} }) {
  const seenPhones = new Set(existingPhones.map(normalizePhone).filter(Boolean));
  const fileSeen = new Set();

  return rows.map((cells, index) => {
    const data = { name: '', phone: '', company: '' };
    mapping.forEach((field, colIndex) => {
      if (field === SKIP_FIELD) return;
      const value = (cells[colIndex] ?? '').toString().trim();
      if (value) data[field] = value;
    });

    const rowOverride = overrides[index];
    if (rowOverride) {
      Object.entries(rowOverride).forEach(([field, value]) => {
        if (value !== undefined) data[field] = value.toString().trim();
      });
    }

    const isEmptyRow = !data.name && !data.phone && !data.company;

    let status = 'valid';
    let error = '';

    if (isEmptyRow) {
      status = 'invalid';
      error = 'Empty row';
    } else if (!data.phone) {
      status = 'invalid';
      error = 'Phone number is required';
    } else if (!isValidPhone(data.phone)) {
      status = 'invalid';
      error = 'Phone number looks invalid';
    } else {
      const normalized = normalizePhone(data.phone);
      if (seenPhones.has(normalized)) {
        status = 'duplicate';
        error = fileSeen.has(normalized) ? 'Duplicate in this file' : 'Already exists in Contacts';
      } else {
        fileSeen.add(normalized);
        seenPhones.add(normalized);
      }
    }

    return { rowNumber: index + 1, data, status, error };
  });
}
