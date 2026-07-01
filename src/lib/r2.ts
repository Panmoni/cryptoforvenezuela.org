/** Serves an R2 object with HTTP Range support. Without this, `<video>`
 * playback fails outright in several browsers (notably iOS Safari, which
 * refuses to play anything the server won't serve as 206 Partial Content
 * for seek/buffer requests) — a plain full-body response only ever works
 * for images and small files. */
export async function serveR2Object(
  bucket: R2Bucket,
  key: string,
  request: Request,
  cacheControl: string,
): Promise<Response> {
  const object = await bucket.get(key, { range: request.headers });
  if (!object) return new Response("not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", cacheControl);

  if (object.range) {
    const { offset, length } = object.range as { offset: number; length: number };
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }

  return new Response(object.body, { status: 200, headers });
}
