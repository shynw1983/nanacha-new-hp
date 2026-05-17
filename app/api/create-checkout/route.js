const legacyHandler = require("../../../api/create-checkout");

const toNodeRequest = async (request) => {
  const body = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
  const headers = Object.fromEntries(request.headers.entries());

  return {
    method: request.method,
    headers,
    [Symbol.asyncIterator]: async function* () {
      if (body.length) {
        yield body;
      }
    },
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

export async function POST(request) {
  const adapter = createNodeResponse();
  await legacyHandler(await toNodeRequest(request), adapter.response);
  return adapter.toResponse();
}

export function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
