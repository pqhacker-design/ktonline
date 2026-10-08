/**
 * Vietnamese Name and Alphanumeric Sorting Utilities
 * Đảm bảo sắp xếp chuẩn vần tiếng Việt (Tên trước, Họ đệm sau)
 * và sắp xếp số tự nhiên (1, 2, 3... 10... thay vì 1, 10, 2)
 */

export interface SplitName {
  firstName: string; // Tên chính (An, Bình, Cường...)
  lastName: string;  // Họ và tên đệm (Nguyễn Văn, Trần Thị...)
  fullName: string;
}

/**
 * Tách họ tên tiếng Việt thành Tên chính và Họ đệm
 */
export function splitVietnameseName(fullName: string): SplitName {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) {
    return { firstName: '', lastName: '', fullName: '' };
  }

  const parts = clean.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', fullName: clean };
  }

  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, parts.length - 1).join(' ');

  return { firstName, lastName, fullName: clean };
}

/**
 * So sánh 2 họ tên tiếng Việt theo chuẩn ngành Giáo dục:
 * - So sánh Tên chính trước (A - Z theo vần tiếng Việt)
 * - Nếu Tên chính trùng nhau, so sánh tiếp Họ và Tên đệm
 */
export function compareVietnameseNames(nameA: string, nameB: string): number {
  const a = splitVietnameseName(nameA);
  const b = splitVietnameseName(nameB);

  // 1. So sánh Tên chính
  const cmpFirst = a.firstName.localeCompare(b.firstName, 'vi', { sensitivity: 'base' });
  if (cmpFirst !== 0) return cmpFirst;

  // 2. Nếu Tên giống nhau, so sánh Họ & Đệm
  const cmpLast = a.lastName.localeCompare(b.lastName, 'vi', { sensitivity: 'base' });
  if (cmpLast !== 0) return cmpLast;

  // 3. Toàn bộ chuỗi
  return a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'base' });
}

/**
 * So sánh tự nhiên cho chuỗi có số (natural compare):
 * "1" < "2" < "9" < "10" < "11"
 * "10A1" < "10A2" < "10A10"
 */
export function naturalCompare(a: string = '', b: string = ''): number {
  return (a || '').localeCompare(b || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Sắp xếp danh sách học sinh theo thứ tự chuẩn ổn định (Thứ tự nhập ban đầu hoặc SBD hoặc Tên)
 */
export function sortStudentsDefault<T extends { orderIndex?: number; sbd?: string; name: string; createdAt?: string }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    // 1. Ưu tiên orderIndex (thứ tự khi thêm/nhập từ Excel)
    if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    } else if (typeof a.orderIndex === 'number') {
      return -1;
    } else if (typeof b.orderIndex === 'number') {
      return 1;
    }

    // 2. Nếu không có orderIndex, dùng SBD (so sánh số tự nhiên)
    if (a.sbd && b.sbd && a.sbd !== b.sbd) {
      return naturalCompare(a.sbd, b.sbd);
    }

    // 3. Dùng thời gian tạo createdAt nếu có
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }

    // 4. Theo Tên tiếng Việt
    return compareVietnameseNames(a.name, b.name);
  });
}
