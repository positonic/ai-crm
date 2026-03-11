import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { hashPassword, validatePassword } from "~/utils/password";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  invitationToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 },
      );
    }

    const { name, email: rawEmail, password, invitationToken } = result.data;
    const email = rawEmail.toLowerCase().trim();

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    // If invitation token is provided, validate it
    let invitation = null;
    if (invitationToken) {
      invitation = await db.invitation.findUnique({
        where: { token: invitationToken },
        include: {
          event: true,
          role: true,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Invalid invitation token" },
          { status: 400 },
        );
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json(
          { error: "Invitation has already been processed" },
          { status: 400 },
        );
      }

      if (invitation.expiresAt < new Date()) {
        // Mark invitation as expired
        await db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 },
        );
      }

      if (invitation.email.toLowerCase() !== email) {
        return NextResponse.json(
          { error: "Email does not match invitation" },
          { status: 400 },
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If there's an invitation and user already exists, assign the role
      if (invitation) {
        try {
          if (invitation.type === "EVENT_ROLE") {
            // Check if user already has this role for this event
            const existingRole = await db.userRole.findUnique({
              where: {
                userId_eventId_roleId: {
                  userId: existingUser.id,
                  eventId: invitation.eventId!,
                  roleId: invitation.roleId!,
                },
              },
            });

            if (!existingRole) {
              // Create user role assignment
              await db.userRole.create({
                data: {
                  userId: existingUser.id,
                  eventId: invitation.eventId!,
                  roleId: invitation.roleId!,
                },
              });
            }
          } else if (
            invitation.type === "GLOBAL_ADMIN" ||
            invitation.type === "GLOBAL_STAFF"
          ) {
            // Update user's global role if not already at that level
            if (existingUser.role !== invitation.globalRole) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { role: invitation.globalRole },
              });
            }
          }

          // Mark invitation as accepted
          await db.invitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
            },
          });

          const message =
            invitation.type === "EVENT_ROLE"
              ? `User already exists with this email, but invitation to ${invitation.event?.name} as ${invitation.role?.name} has been accepted. Please sign in.`
              : `User already exists with this email, but has been promoted to global ${invitation.globalRole}. Please sign in.`;

          return NextResponse.json(
            {
              error: message,
              userExists: true,
              invitation: {
                type: invitation.type,
                eventName: invitation.event?.name,
                roleName: invitation.role?.name ?? invitation.globalRole,
              },
            },
            { status: 409 },
          );
        } catch (error) {
          console.error("Failed to assign role to existing user:", error);
        }
      }

      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 },
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // If there was an invitation, assign the role and mark invitation as accepted
    if (invitation) {
      try {
        if (invitation.type === "EVENT_ROLE") {
          // Create user role assignment for event-specific roles
          await db.userRole.create({
            data: {
              userId: user.id,
              eventId: invitation.eventId!,
              roleId: invitation.roleId!,
            },
          });
        } else if (
          invitation.type === "GLOBAL_ADMIN" ||
          invitation.type === "GLOBAL_STAFF"
        ) {
          // Update user's global role
          await db.user.update({
            where: { id: user.id },
            data: { role: invitation.globalRole },
          });
        }

        // Mark invitation as accepted
        await db.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        const responseMessage =
          invitation.type === "EVENT_ROLE"
            ? `User registered successfully with invitation to ${invitation.event?.name} as ${invitation.role?.name}`
            : `User registered successfully as global ${invitation.globalRole}`;

        return NextResponse.json(
          {
            message: responseMessage,
            user: {
              ...user,
              role:
                invitation.type === "EVENT_ROLE"
                  ? user.role
                  : invitation.globalRole,
            },
            invitation: {
              type: invitation.type,
              eventName: invitation.event?.name,
              roleName: invitation.role?.name ?? invitation.globalRole,
            },
          },
          { status: 201 },
        );
      } catch (error) {
        console.error("Failed to assign role from invitation:", error);
        // User was created but role assignment failed - still return success
        // The user can be manually assigned the role later
      }
    }

    return NextResponse.json(
      { message: "User registered successfully", user },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
