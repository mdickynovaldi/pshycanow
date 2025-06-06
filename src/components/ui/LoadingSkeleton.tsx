export function ClassCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded mr-3"></div>
            <div>
              <div className="w-32 h-5 bg-gray-300 rounded mb-2"></div>
              <div className="w-24 h-3 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-6">
        {/* Description */}
        <div className="mb-4">
          <div className="flex items-start">
            <div className="w-4 h-4 bg-gray-200 rounded mr-2 mt-0.5"></div>
            <div className="flex-1">
              <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
              <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="w-5 h-5 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="w-8 h-6 bg-gray-200 rounded mx-auto mb-1"></div>
            <div className="w-12 h-3 bg-gray-200 rounded mx-auto"></div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="w-5 h-5 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="w-8 h-6 bg-gray-200 rounded mx-auto mb-1"></div>
            <div className="w-12 h-3 bg-gray-200 rounded mx-auto"></div>
          </div>
        </div>
        
        {/* Actions skeleton */}
        <div className="flex flex-col space-y-2">
          <div className="w-full h-10 bg-gray-200 rounded-lg"></div>
          <div className="w-full h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
      
      {/* Footer skeleton */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
            <div className="w-8 h-3 bg-gray-300 rounded"></div>
          </div>
          <div className="w-16 h-3 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function HeaderStatsSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-gray-200 px-8 py-6 rounded-t-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="w-10 h-10 bg-gray-300 rounded mr-4"></div>
            <div>
              <div className="w-32 h-6 bg-gray-300 rounded mb-2"></div>
              <div className="w-48 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="w-40 h-12 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-gray-100 rounded-lg p-4 text-center">
              <div className="w-6 h-6 bg-gray-200 rounded mx-auto mb-2"></div>
              <div className="w-8 h-7 bg-gray-200 rounded mx-auto mb-1"></div>
              <div className="w-16 h-3 bg-gray-200 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 min-w-0">
          <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
          <div className="w-32 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
} 