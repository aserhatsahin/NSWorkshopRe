import { initialsOf, pigmentFor } from "@/lib/pigment";

type AvatarBlobProps = {
  name: string;
  // Aynı gruptaki öğrenciler aynı renkte görünsün diye grup kimliği verilir.
  pigmentSeed: string;
  size?: "sm" | "lg";
};

export function AvatarBlob({ name, pigmentSeed, size = "sm" }: AvatarBlobProps) {
  return (
    <span
      aria-hidden
      className={`blob flex shrink-0 items-center justify-center font-medium ${pigmentFor(pigmentSeed)} ${
        size === "lg" ? "size-14 text-lg" : "size-10 text-sm"
      }`}
    >
      {initialsOf(name)}
    </span>
  );
}
