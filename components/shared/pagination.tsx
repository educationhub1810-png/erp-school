import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  skip: number;
  pageParam?: string;
  queryString?: string;
}

export function Pagination({ page, totalPages, total, limit, skip, pageParam = "page", queryString = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prefix = queryString ? `${queryString}&` : "";

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <p>Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}</p>
      <div className="flex gap-2">
        {page > 1 && (
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?${prefix}${pageParam}=${page - 1}`} />}>
            Previous
          </Button>
        )}
        {page < totalPages && (
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`?${prefix}${pageParam}=${page + 1}`} />}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
