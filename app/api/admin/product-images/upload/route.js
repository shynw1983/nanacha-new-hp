import { handleUpload } from "@vercel/blob/client";

const { getSessionFromCookieStore, canManageProductCatalog } = require("../../../../../server/admin-auth");

export async function POST(request) {
  const body = await request.json();

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = getSessionFromCookieStore({
          get: (name) => ({ value: request.cookies.get(name)?.value }),
        });
        if (!session || !canManageProductCatalog(session)) {
          throw new Error("Forbidden");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.userId,
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message || "画像をアップロードできませんでした。" }, { status: 400 });
  }
}
