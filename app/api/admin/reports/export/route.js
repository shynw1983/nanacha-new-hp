import { cookies } from "next/headers";

const { getReportData, reportToCsv } = require("../../../../../server/reports");
const { getSessionFromCookieStore, canAccessAllStores } = require("../../../../../server/admin-auth");

export async function GET(request) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const report = await getReportData({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    storeId: searchParams.get("store"),
    status: searchParams.get("status"),
    storeIds: canAccessAllStores(session) ? undefined : session.storeIds.length ? session.storeIds : ["__none__"],
  });
  const csv = reportToCsv(report);
  const filename = `nanacha-report-${report.filters.from}-${report.filters.to}.csv`;

  return new Response(`\ufeff${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
