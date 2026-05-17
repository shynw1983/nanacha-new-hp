const legacyHandler = require("../../../api/lark-image");

const adaptImageRequest = (request) => {
  const url = new URL(request.url);
  return {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries()),
  };
};

const createNodeResponse = () => {
  const headers = new Headers();
  let statusCode = 200;
  let body = Buffer.alloc(0);

  return {
    response: {
      set statusCode(value) {
        statusCode = value;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(name, value) {
        headers.set(name, value);
      },
      end(value = "") {
        body = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
      },
    },
    toResponse() {
      return new Response(body, { status: statusCode, headers });
    },
  };
};

export async function GET(request) {
  const adapter = createNodeResponse();
  await legacyHandler(adaptImageRequest(request), adapter.response);
  return adapter.toResponse();
}
