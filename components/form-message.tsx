import type { FormState } from "@/lib/action-state";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-500">
        {state.success}
      </p>
    );
  }
  return null;
}
