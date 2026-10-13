import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  errors?: string[];
  hint?: string;
};

export function SelectField({ label, name, options, placeholder, errors, hint, ...selectProps }: SelectFieldProps) {
  const describedBy = errors?.length ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        className="field"
        {...selectProps}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
