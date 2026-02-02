import PageSkeleton from '@/components/PageSkeleton';

export default function Loading() {
  return (
    <div className="p-4 sm:p-8 ml-0 lg:ml-64">
      <PageSkeleton />
    </div>
  );
}
