/**
 * Backfill slug field for existing Event records.
 * Generates URL-friendly slugs from event names for all events without slugs.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Generate URL-safe slug from event name.
 * Same logic as eventSlugService.ts for consistency.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Check if slug already exists in database.
 */
async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}

/**
 * Generate unique slug, appending counter if collision detected.
 */
async function generateUniqueSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

async function main() {
  console.log("🔄 Starting event slug backfill...\n");

  try {
    // Get all events without slugs
    const events = await prisma.event.findMany({
      where: { slug: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    console.log(`📊 Found ${events.length} events without slugs\n`);

    if (events.length === 0) {
      console.log("✅ All events already have slugs!");
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const slug = await generateUniqueSlug(event.name, event.id);

        await prisma.event.update({
          where: { id: event.id },
          data: { slug },
        });

        console.log(`✅ ${event.name} -> ${slug}`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update "${event.name}":`, error);
        errors++;
      }
    }

    console.log(`\n✨ Backfill complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    if (errors === 0) {
      console.log(
        "\n💡 Next step: Make slug required in schema and run migration:",
      );
      console.log(
        "   1. Change `slug String?` to `slug String` in schema.prisma",
      );
      console.log(
        "   2. Run: bunx prisma migrate dev --name make_event_slug_required",
      );
    }
  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

void main()
  .catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
