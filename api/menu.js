const { getMenuData } = require("./menu-source");

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  response.end(JSON.stringify(body));
};

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed" });
  }

  const menu = await getMenuData();
  return json(response, 200, menu);
};
