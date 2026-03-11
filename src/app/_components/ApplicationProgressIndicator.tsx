"use client";

interface ApplicationProgressIndicatorProps {
  completedFields: number;
  totalFields: number;
  completionPercentage: number;
  className?: string;
}

export default function ApplicationProgressIndicator({
  completedFields,
  totalFields,
  completionPercentage,
  className = "",
}: ApplicationProgressIndicatorProps) {
  if (totalFields === 0) {
    return null;
  }

  return (
    <div className={`mb-6 bg-blue-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-blue-900">Application Progress</span>
        <span className="text-sm text-blue-700">
          {completedFields}/{totalFields} fields completed
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      {completionPercentage > 0 && (
        <div className="mt-2 text-xs text-blue-600">
          {completionPercentage}% complete
        </div>
      )}
    </div>
  );
}
