import { initialsOf, pigmentFor } from "@/lib/pigment";

type AvatarBlobProps = {
  name: string;
  // Aynı gruptaki öğrenciler aynı renkte görünsün diye grup kimliği verilir.
  pigmentSeed: string;
  size?: "sm" | "lg" | "xl";
  // Fotoğraf varsa baş harflerin yerine gösterilir.
  photoUrl?: string | null;
};

const SIZES = { sm: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl" } as const;

export function AvatarBlob({ name, pigmentSeed, size = "sm", photoUrl }: AvatarBlobProps) {
  const shape = `blob flex shrink-0 items-center justify-center overflow-hidden font-medium ${SIZES[size]}`;

  if (photoUrl) {
    return (
      <span className={shape}>
        {/* next/image kullanılmaz: fotoğraf oturum gerektiren bir rotadan gelir
            ve zaten küçültülmüş olarak saklanır. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span aria-hidden className={`${shape} ${pigmentFor(pigmentSeed)}`}>
      {initialsOf(name)}
    </span>
  );
}
