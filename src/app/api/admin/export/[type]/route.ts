import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { captureApiError } from "~/utils/errorCapture";
import { getDisplayName } from "~/utils/userDisplay";

export const dynamic = "force-dynamic";

function escapeCsvField(field: string): string {
  // Prefix formula-leading characters so spreadsheet apps treat the value as text
  const sanitized = /^[=+\-@]/.test(field) ? `'${field}` : field;
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

function csvResponse(rows: string[], filename: string): Response {
  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { type } = await context.params;

  try {
    const date = new Date().toISOString().slice(0, 10);

    if (type === "contacts") {
      const contacts = await db.contact.findMany({
        include: { sponsor: { select: { name: true } } },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });

      const rows = [
        "First Name,Last Name,Email,Phone,Telegram,LinkedIn,Twitter,GitHub,Sponsor",
      ];
      for (const contact of contacts) {
        rows.push(
          [
            contact.firstName,
            contact.lastName,
            contact.email ?? "",
            contact.phone ?? "",
            contact.telegram ?? "",
            contact.linkedIn ?? "",
            contact.twitter ?? "",
            contact.github ?? "",
            contact.sponsor?.name ?? "",
          ]
            .map(escapeCsvField)
            .join(","),
        );
      }

      Sentry.logger.info("Admin CSV export generated", {
        userId: session.user.id,
        exportType: "contacts",
        rowCount: rows.length - 1,
        method: "GET",
      });
      return csvResponse(rows, `contacts-${date}.csv`);
    }

    if (type === "users") {
      const users = await db.user.findMany({
        select: {
          firstName: true,
          surname: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { firstName: "asc" },
      });

      const rows = ["Full Name,Email,Role"];
      for (const user of users) {
        rows.push(
          [getDisplayName(user, ""), user.email ?? "", user.role ?? ""]
            .map(escapeCsvField)
            .join(","),
        );
      }

      Sentry.logger.info("Admin CSV export generated", {
        userId: session.user.id,
        exportType: "users",
        rowCount: rows.length - 1,
        method: "GET",
      });
      return csvResponse(rows, `users-${date}.csv`);
    }

    return new Response("Unknown export type. Use 'contacts' or 'users'.", {
      status: 404,
    });
  } catch (error) {
    captureApiError(error, {
      userId: session.user.id,
      route: "admin.export",
      method: "GET",
      input: { type },
    });
    return new Response("Internal server error", { status: 500 });
  }
}
