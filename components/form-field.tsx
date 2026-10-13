import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

export function FormField({ label, name, errors, hint, ...inputProps }: FormFieldProps) {
  const describedBy = errors?.length ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        className="field"
        {...inputProps}
      />
      {errors?.length ? (
        <span id={`${name}-error`} className="font-normal text-danger">
          {errors.join(" ")}
        </span>
      ) : hint ? (
        <span id={`${name}-hint`} className="font-normal text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
