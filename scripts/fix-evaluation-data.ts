import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function investigateAndFixEvaluations() {
  console.log("🔍 Investigating evaluation data integrity issues...\n");

  // Get the specific evaluation IDs mentioned
  const evaluationIds = [
    "cmgcjocmq0013uoyqiatvnzfw", // Local evaluation
    "cmgcjb06o0001uoyq9iiivhl6", // Production evaluation
  ];

  for (const evalId of evaluationIds) {
    console.log(`\n=== Evaluation ID: ${evalId} ===`);

    try {
      // Get the evaluation with its application
      const evaluation = await prisma.applicationEvaluation.findUnique({
        where: { id: evalId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          reviewer: {
            select: { id: true, name: true, email: true, isAIReviewer: true },
          },
        },
      });

      if (!evaluation) {
        console.log(`❌ Evaluation ${evalId} not found`);
        continue;
      }

      console.log(`📋 Application ID: ${evaluation.application.id}`);
      console.log(
        `👤 Reviewer: ${evaluation.reviewer.name} (AI: ${evaluation.reviewer.isAIReviewer})`,
      );
      console.log(`📧 Application Email: ${evaluation.application.email}`);
      console.log(`🔗 Current userId: ${evaluation.application.userId}`);
      console.log(
        `👥 Current user object: ${evaluation.application.user ? "EXISTS" : "NULL"}`,
      );

      // If userId is null, try to find matching user by email
      if (!evaluation.application.userId && evaluation.application.email) {
        console.log(
          `🔍 Searching for user with email: ${evaluation.application.email}`,
        );

        const matchingUser = await prisma.user.findUnique({
          where: { email: evaluation.application.email },
        });

        if (matchingUser) {
          console.log(
            `✅ Found matching user: ${matchingUser.name} (${matchingUser.id})`,
          );
          console.log(
            `📝 Admin Notes: ${matchingUser.adminNotes ? "EXISTS" : "NONE"}`,
          );
          console.log(
            `🏷️  Admin Labels: ${matchingUser.adminLabels?.length || 0} labels`,
          );

          // Ask if we should fix this
          console.log(
            `\n🛠️  FIX AVAILABLE: Link application ${evaluation.application.id} to user ${matchingUser.id}`,
          );
        } else {
          console.log(
            `❌ No user found with email: ${evaluation.application.email}`,
          );

          // Check if there are users with similar emails
          const similarUsers = await prisma.user.findMany({
            where: {
              email: {
                contains: evaluation.application.email.split("@")[0],
              },
            },
            select: { id: true, name: true, email: true },
          });

          if (similarUsers.length > 0) {
            console.log(
              `🔍 Found ${similarUsers.length} users with similar emails:`,
            );
            similarUsers.forEach((user) => {
              console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing evaluation ${evalId}:`, error);
    }
  }

  console.log("\n🏁 Investigation complete");
}

async function fixSpecificApplication(applicationId: string, userId: string) {
  console.log(`🛠️  Fixing application ${applicationId} -> user ${userId}`);

  try {
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { userId: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            adminNotes: true,
            adminLabels: true,
          },
        },
      },
    });

    console.log(
      `✅ Successfully linked application to user: ${updated.user?.name}`,
    );
    console.log(
      `📝 Admin Notes: ${updated.user?.adminNotes ? "EXISTS" : "NONE"}`,
    );
    console.log(
      `🏷️  Admin Labels: ${updated.user?.adminLabels?.length ?? 0} labels`,
    );

    return updated;
  } catch (error) {
    console.error(`❌ Error fixing application:`, error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await investigateAndFixEvaluations();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for manual use
export { investigateAndFixEvaluations, fixSpecificApplication };

// Run if called directly
void main();
