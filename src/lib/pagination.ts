export const POSTS_PER_PAGE = 6;

export function getTotalPages(itemCount: number, pageSize = POSTS_PER_PAGE) {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function getPageItems<T>(
  items: T[],
  currentPage: number,
  pageSize = POSTS_PER_PAGE
) {
  const page = Math.max(1, currentPage);
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getPaginatedPageNumbers(itemCount: number, pageSize = POSTS_PER_PAGE) {
  const totalPages = getTotalPages(itemCount, pageSize);

  return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page > 1
  );
}
