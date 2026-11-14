/**
 * Open Letter Signatures & Community Voices Utility Functions
 */

export interface NormalizedRegion {
  key: string;
  label: string;
}

/**
 * Anonymize name by only preserving the very first character,
 * masking subsequent characters with asterisks (max 4 asterisks).
 * Example:
 * - "陳大明" -> "陳**"
 * - "李四" -> "李*"
 * - "Bax" -> "B**"
 * - "Nguyễn Hoàng Huy" -> "N****"
 * - "" -> "匿名連署人"
 */
export function maskName(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '匿名連署人';

  const chars = Array.from(trimmed);
  const first = chars[0];
  if (chars.length === 1) {
    return `${first}*`;
  }

  const maskLen = Math.max(1, Math.min(chars.length - 1, 4));
  return `${first}${'*'.repeat(maskLen)}`;
}

/**
 * Normalize messy region inputs from open petition forms
 */
export function normalizeRegion(r?: string | null): NormalizedRegion {
  const raw = (r || '').trim();
  if (!raw) return { key: 'UNSPECIFIED', label: '未填寫' };

  const lower = raw.toLowerCase();

  // Taiwan variants
  if (
    raw === '台灣' ||
    raw === '臺灣' ||
    raw === '台湾' ||
    raw === '臺灣🇹🇼' ||
    raw === ',台灣' ||
    raw === 'S台灣' ||
    lower === 'taiwan' ||
    lower === 'tw'
  ) {
    return { key: 'TW', label: '台灣' };
  }

  // Hong Kong variants
  if (
    raw === '香港' ||
    lower.includes('hong') ||
    lower.includes('hksar') ||
    lower === 'hk' ||
    lower === 'hkg'
  ) {
    return { key: 'HK', label: '香港' };
  }

  // Macau variants
  if (raw === '澳門' || lower.includes('macau') || lower.includes('macao')) {
    return { key: 'MO', label: '澳門' };
  }

  // Vietnam variants
  if (raw === 'Việt Nam' || raw === 'Viet Nam' || lower.includes('vietnam')) {
    return { key: 'VN', label: '越南' };
  }

  // Japan variants
  if (raw === '日本' || lower.includes('japan')) {
    return { key: 'JP', label: '日本' };
  }

  // Malaysia variants
  if (raw === '馬來西亞' || lower.includes('malaysia')) {
    return { key: 'MY', label: '馬來西亞' };
  }

  // Oceania / Australia
  if (lower.includes('oceania') || lower.includes('australia')) {
    return { key: 'OCE', label: '大洋洲' };
  }

  // North America
  if (raw === '美國' || lower.includes('canada') || lower.includes('usa') || lower.includes('states')) {
    return { key: 'NA', label: '北美地區' };
  }

  return { key: 'OTHER', label: '其他地區' };
}

export interface SignatureFilterable {
  maskedName: string;
  regionKey: string;
  regionLabel: string;
  organization?: string;
  message?: string;
}

/**
 * Filter signatures by region and search query
 */
export function filterSignatures<T extends SignatureFilterable>(
  list: T[],
  query: string,
  regionKey: string
): T[] {
  const q = query.trim().toLowerCase();

  return list.filter((item) => {
    // Region match
    if (regionKey !== 'ALL') {
      if (regionKey === 'OTHER_GROUP') {
        if (item.regionKey === 'TW' || item.regionKey === 'HK' || item.regionKey === 'VN') {
          return false;
        }
      } else if (item.regionKey !== regionKey) {
        return false;
      }
    }

    // Query match
    if (!q) return true;

    const inMsg = item.message ? item.message.toLowerCase().includes(q) : false;
    const inOrg = item.organization ? item.organization.toLowerCase().includes(q) : false;
    const inName = item.maskedName.toLowerCase().includes(q);
    const inReg = item.regionLabel.toLowerCase().includes(q);

    return inMsg || inOrg || inName || inReg;
  });
}
