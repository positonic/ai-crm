"use client";

import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";

interface ApplicationCompletionStatusProps {
  isComplete: boolean;
  isSubmitted: boolean;
  missingFields: string[];
  onSubmit?: () => void;
  onContinueEditing?: () => void;
  wasReverted?: boolean;
  shouldShowMissingFields?: boolean;
  className?: string;
}

export default function ApplicationCompletionStatus({
  isComplete,
  isSubmitted,
  missingFields,
  onSubmit,
  onContinueEditing,
  wasReverted,
  shouldShowMissingFields = true,
  className = "",
}: ApplicationCompletionStatusProps) {
  // Don't show anything if already submitted
  if (isSubmitted) {
    return null;
  }

  // Format field names for display
  const formatFieldName = (fieldKey: string): string => {
    return fieldKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isComplete) {
    return (
      <div
        className={`mb-6 bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-green-500 rounded-full p-1 flex-shrink-0">
            <IconCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">
              {wasReverted
                ? "Application Ready for Re-submission! ✏️"
                : "Application Complete! 🎉"}
            </h3>
            <p className="text-green-700 text-sm mt-1">
              {wasReverted
                ? "You made changes to a submitted application. All required fields are complete - you can re-submit or continue editing."
                : "All required fields have been filled. You can now submit your application or continue making edits."}
            </p>
          </div>
        </div>

        {(Boolean(onSubmit) || Boolean(onContinueEditing)) && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {onSubmit && (
              <button
                onClick={onSubmit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Submit Application
              </button>
            )}
            {onContinueEditing && (
              <button
                onClick={onContinueEditing}
                className="border border-green-600 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg transition-colors"
              >
                Continue Editing
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Only show missing fields alert when appropriate (submit attempt or existing progress)
  if (!shouldShowMissingFields) {
    return null;
  }

  // Application is not complete - show missing fields
  return (
    <div
      className={`mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="bg-yellow-500 rounded-full p-1 flex-shrink-0 mt-0.5">
          <IconExclamationCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-2">
            Complete Your Application
          </h3>
          <p className="text-yellow-700 text-sm mb-3">
            Please fill out the following required fields to complete your
            application:
          </p>

          {missingFields.length > 0 && (
            <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
              {missingFields.map((field) => (
                <li key={field}>{formatFieldName(field)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
