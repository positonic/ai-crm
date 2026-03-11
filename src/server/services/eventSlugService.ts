import { type PrismaClient } from "@prisma/client";

/**
 * Service for generating and managing event slugs.
 * Provides URL-friendly identifiers for events with collision handling.
 */
export class EventSlugService {
  constructor(private db: PrismaClient) {}

  /**
   * Generate URL-safe slug from event name.
   * Uses same pattern as githubProjectSync.ts for consistency.
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim()
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Generate unique slug, appending counter if collision detected.
   * @param name - The event name to generate slug from
   * @param excludeId - Optional event ID to exclude from collision check (for updates)
   */
  async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Check if slug already exists in database.
   */
  private async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.db.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return false;
    if (excludeId && existing.id === excludeId) return false;
    return true;
  }

  /**
   * Resolve event identifier - accepts both CUID and slug.
   * Provides backward compatibility for existing URLs.
   * @param identifier - Either event ID (CUID) or slug
   * @returns The event ID
   * @throws Error if event not found
   */
  async resolveEventIdentifier(identifier: string): Promise<string> {
    // First try to find by ID directly
    const eventById = await this.db.event.findUnique({
      where: { id: identifier },
      select: { id: true },
    });
    if (eventById) return eventById.id;

    // If not found by ID, try slug lookup
    const eventBySlug = await this.db.event.findUnique({
      where: { slug: identifier },
      select: { id: true },
    });

    if (!eventBySlug) {
      throw new Error(`Event not found: ${identifier}`);
    }

    return eventBySlug.id;
  }

  /**
   * Get event by identifier (ID or slug).
   * Convenience method that returns the full event.
   */
  async getEventByIdentifier(identifier: string) {
    // Try ID first
    const eventById = await this.db.event.findUnique({
      where: { id: identifier },
    });
    if (eventById) return eventById;

    // Try slug
    return this.db.event.findUnique({
      where: { slug: identifier },
    });
  }
}

/**
 * Factory function to create EventSlugService instance.
 */
export function getEventSlugService(db: PrismaClient): EventSlugService {
  return new EventSlugService(db);
}
