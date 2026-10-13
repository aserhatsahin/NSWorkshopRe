import { UnauthenticatedError } from "@/lib/permissions/errors";
import { getStudentPhoto } from "@/modules/photos/service";

// Fotoğraflar herkese açık bir adreste durmaz; her istek oturuma ve
// yetkiye bakılarak bu rotadan sunulur.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let photo;
  try {
    photo = await getStudentPhoto(id);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Response(null, { status: 401 });
    }
    throw error;
  }

  // Yetkisi olmayana da "yok" denir; fotoğrafın var olup olmadığı sızmasın.
  if (!photo) {
    return new Response(null, { status: 404 });
  }

  return new Response(photo.data as BodyInit, {
    headers: {
      "Content-Type": photo.mimeType,
      // Tarayıcı içeriği başka bir tür gibi yorumlamasın.
      "X-Content-Type-Options": "nosniff",
      // Yalnızca bu kullanıcının tarayıcısında saklanır; adres sürüm
      // numarası taşıdığı için fotoğraf değişince yenisi istenir.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
