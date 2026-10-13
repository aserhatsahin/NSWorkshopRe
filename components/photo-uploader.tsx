"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { secondaryButton } from "@/components/button-styles";
import { FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/action-state";
import { PHOTO_MIME_TYPE, PHOTO_SIZE } from "@/modules/photos/rules";

type PhotoUploaderProps = {
  hasPhoto: boolean;
  uploadAction: (state: FormState, formData: FormData) => Promise<FormState>;
  removeAction: () => Promise<FormState>;
};

// Seçilen görseli ortadan kare kırpıp PHOTO_SIZE piksele küçültür. Telefon
// kamerasından gelen birkaç MB'lık fotoğraf böylece birkaç on KB'a iner ve
// konum gibi gömülü bilgiler (EXIF) de düşer.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas kullanılamıyor");
  }
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("görsel dönüştürülemedi"))), PHOTO_MIME_TYPE, 0.85);
  });
}

export function PhotoUploader({ hasPhoto, uploadAction, removeAction }: PhotoUploaderProps) {
  const [uploadState, upload, isUploading] = useActionState(uploadAction, {});
  const [removeState, remove, isRemoving] = useActionState(removeAction, {});
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = isUploading || isRemoving;

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setLocalError(null);
    try {
      const formData = new FormData();
      formData.set("photo", await toSquareJpeg(file), "photo.jpg");
      startTransition(() => upload(formData));
    } catch {
      setLocalError("Bu dosya fotoğraf olarak açılamadı. Başka bir fotoğraf dene.");
    } finally {
      // Aynı dosya yeniden seçilebilsin.
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Fotoğraf seç"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <button type="button" disabled={isBusy} onClick={() => inputRef.current?.click()} className={secondaryButton}>
          {isUploading ? "Yükleniyor…" : hasPhoto ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
        </button>
        {hasPhoto ? (
          <form action={remove}>
            <button type="submit" disabled={isBusy} className="px-2 py-2 text-sm text-muted underline disabled:opacity-60">
              {isRemoving ? "Kaldırılıyor…" : "Kaldır"}
            </button>
          </form>
        ) : null}
      </div>
      {localError ? (
        <p role="alert" className="text-sm text-danger">
          {localError}
        </p>
      ) : (
        <FormMessage state={uploadState.error || uploadState.success ? uploadState : removeState} />
      )}
    </div>
  );
}
