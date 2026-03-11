import { db } from "~/server/db";
import { writeFileSync } from "fs";
import { join } from "path";

async function exportResidencyVideos() {
  console.log("Fetching accepted residency applications with videos...");

  const applications = await db.application.findMany({
    where: {
      eventId: "funding-commons-residency-2025",
      status: "ACCEPTED",
      responses: {
        some: {
          questionId: "cmeh86jhe0020uo43qqj2085b",
          // Only include applications that have a non-empty video response
          answer: {
            not: "",
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      responses: {
        where: {
          questionId: "cmeh86jhe0020uo43qqj2085b",
        },
        include: {
          question: {
            select: {
              questionEn: true,
              questionKey: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${applications.length} accepted applications with videos`);

  // Create CSV data
  const csvHeaders = [
    "Application ID",
    "User ID",
    "User Name",
    "User Email",
    "Video URL",
    "Application Status",
    "Submitted At",
    "Created At",
  ];

  const csvRows = applications.map((app) => [
    app.id,
    app.user?.id ?? "N/A",
    app.user?.name ?? "N/A",
    app.user?.email ?? app.email, // Fallback to application email if user email not available
    app.responses[0]?.answer ?? "N/A", // Video URL from the response
    app.status,
    app.submittedAt?.toISOString() ?? "N/A",
    app.createdAt.toISOString(),
  ]);

  // Convert to CSV format
  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map((row) =>
      row
        .map((field) =>
          // Escape fields that contain commas, quotes, or newlines
          typeof field === "string" &&
          (field.includes(",") || field.includes('"') || field.includes("\n"))
            ? `"${field.replace(/"/g, '""')}"`
            : field,
        )
        .join(","),
    ),
  ].join("\n");

  // Write to file
  const outputPath = join(
    process.cwd(),
    "residency-applications-with-videos.csv",
  );
  writeFileSync(outputPath, csvContent, "utf-8");

  console.log(
    `✅ Exported ${applications.length} applications to: ${outputPath}`,
  );
  console.log("\nSample data:");
  applications.slice(0, 3).forEach((app) => {
    console.log(
      `- ${app.user?.name ?? "Unknown"} (${app.user?.email ?? app.email}): ${app.responses[0]?.answer?.substring(0, 50)}...`,
    );
  });
}

// Run the export
exportResidencyVideos()
  .catch(console.error)
  .finally(() => process.exit());
