import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { sendEmail } from "./email";

// Prisma singleton imported from @/lib/db/prisma

export type PipelineStage =
  | "LEAD"
  | "QUALIFIED"
  | "INSPECTION_SCHEDULED"
  | "INSPECTED"
  | "ESTIMATE_SENT"
  | "INSURANCE_CLAIM"
  | "APPROVED"
  | "PRODUCTION"
  | "FINAL_QA"
  | "INVOICED"
  | "PAID"
  | "WARRANTY"
  | "ARCHIVED";

/**
 * Trigger automations when a project stage changes
 */
export async function onStageChange(
  projectId: string,
  newStage: PipelineStage,
  oldStage?: PipelineStage,
  userId?: string
) {
  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        contacts: true,
        properties: true,
        Org: true,
      },
    });

    if (!project) {
      logger.error(`Project ${projectId} not found for stage change automation`);
      return;
    }

    // Log the stage change as an activity
    await prisma.activities.create({
      data: {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        orgId: project.orgId,
        projectId,
        type: "stage_change",
        title: `Stage changed to ${newStage}`,
        description: oldStage ? `Changed from ${oldStage} to ${newStage}` : `Set to ${newStage}`,
        userId: userId || "system",
        userName: "System",
        updatedAt: new Date(),
      },
    });

    // Execute stage-specific automations
    switch (newStage) {
      case "INSPECTION_SCHEDULED":
        await handleInspectionScheduled(project);
        break;

      case "INSPECTED":
        await handleInspectionCompleted(project);
        break;

      case "ESTIMATE_SENT":
        await handleEstimateSent(project);
        break;

      case "INSURANCE_CLAIM":
        await handleClaimFiled(project);
        break;

      case "APPROVED":
        await handleClaimApproved(project);
        break;

      case "PRODUCTION":
        await handleProductionStarted(project);
        break;

      case "FINAL_QA":
        await handleFinalQA(project);
        break;

      case "PAID":
        await handleProjectPaid(project);
        break;

      default:
        logger.debug(`No automation defined for stage: ${newStage}`);
    }
  } catch (error) {
    logger.error("Error in stage change automation:", error);
  }
}

async function handleInspectionScheduled(project: any) {
  // Create reminder tasks
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 1); // Tomorrow

  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Inspection Reminder",
      description: `Inspection scheduled for ${project.properties?.street}, ${project.properties?.city}`,
      dueAt: reminderDate,
      status: "TODO",
      priority: "HIGH",
      updatedAt: new Date(),
    },
  });

  // Send email notification (if email service is configured)
  if (project.contacts?.email) {
    try {
      await sendEmail({
        to: project.contacts.email,
        subject: "Inspection Scheduled",
        template: "inspection_scheduled",
        data: {
          contactName: `${project.contacts.firstName} ${project.contacts.lastName}`,
          propertyAddress: `${project.properties?.street}, ${project.properties?.city}`,
          projectTitle: project.title,
        },
      });
    } catch (error) {
      logger.error("Failed to send inspection email:", error);
    }
  }
}

async function handleInspectionCompleted(project: any) {
  // Create tasks to generate inspection summary
  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Generate Inspection Summary",
      description: "Generate AI-powered inspection summary report",
      status: "TODO",
      priority: "MEDIUM",
      updatedAt: new Date(),
    },
  });

  // Log activity
  await prisma.activities.create({
    data: {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      type: "inspection_completed",
      title: "Inspection Completed",
      description: "Property inspection has been completed",
      userId: "system",
      userName: "System",
      updatedAt: new Date(),
    },
  });
}

async function handleEstimateSent(project: any) {
  // Create follow-up tasks for 7 days later
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 7);

  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Estimate Follow-up",
      description: "Follow up on sent estimate with client",
      dueAt: followUpDate,
      status: "TODO",
      priority: "MEDIUM",
      updatedAt: new Date(),
    },
  });

  // Send email to client
  if (project.contacts?.email) {
    try {
      await sendEmail({
        to: project.contacts.email,
        subject: "Your Property Estimate",
        template: "estimate_sent",
        data: {
          contactName: `${project.contacts.firstName} ${project.contacts.lastName}`,
          propertyAddress: `${project.properties?.street}, ${project.properties?.city}`,
          projectTitle: project.title,
        },
      });
    } catch (error) {
      logger.error("Failed to send estimate email:", error);
    }
  }
}

async function handleClaimFiled(project: any) {
  // Create tasks to track claim progress
  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Track Insurance Claim",
      description: "Monitor insurance claim approval status",
      status: "TODO",
      priority: "HIGH",
      updatedAt: new Date(),
    },
  });
}

async function handleClaimApproved(project: any) {
  // Create production planning tasks
  const productionTasks = [
    {
      title: "Schedule Production",
      description: "Schedule work crews and materials",
      priority: "HIGH" as const,
    },
    {
      title: "Order Materials",
      description: "Order necessary materials for the job",
      priority: "HIGH" as const,
    },
    {
      title: "Notify Customer",
      description: "Notify customer of claim approval and next steps",
      priority: "MEDIUM" as const,
    },
  ];

  for (const taskItem of productionTasks) {
    await prisma.tasks.create({
      data: {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        orgId: project.orgId,
        projectId: project.id,
        title: taskItem.title,
        description: taskItem.description,
        status: "TODO",
        priority: taskItem.priority,
        updatedAt: new Date(),
      },
    });
  }

  // Notify billing team
  await prisma.activities.create({
    data: {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      type: "claim_approved",
      title: "Claim Approved",
      description: "Insurance claim has been approved, ready for production",
      userId: "system",
      userName: "System",
      updatedAt: new Date(),
    },
  });
}

async function handleProductionStarted(project: any) {
  // Create daily check-in tasks
  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Production Check-in",
      description: "Daily production progress check",
      status: "TODO",
      priority: "MEDIUM",
      updatedAt: new Date(),
    },
  });
}

async function handleFinalQA(project: any) {
  // Create photo checklist tasks
  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Final Photo Documentation",
      description: "Complete final photo documentation checklist",
      status: "TODO",
      priority: "HIGH",
      updatedAt: new Date(),
    },
  });

  // Create final packet generation tasks
  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "Generate Final Packet",
      description: "Generate comprehensive final project packet",
      status: "TODO",
      priority: "MEDIUM",
      updatedAt: new Date(),
    },
  });
}

async function handleProjectPaid(project: any) {
  // Mark project as complete
  await prisma.projects.update({
    where: { id: project.id },
    data: {
      actualEndDate: new Date(),
    },
  });

  // Schedule warranty check for 12 months
  const warrantyDate = new Date();
  warrantyDate.setFullYear(warrantyDate.getFullYear() + 1);

  await prisma.tasks.create({
    data: {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orgId: project.orgId,
      projectId: project.id,
      title: "12-Month Warranty Check",
      description: "Follow up on project warranty status",
      dueAt: warrantyDate,
      status: "TODO",
      priority: "LOW",
      updatedAt: new Date(),
    },
  });

  // Send completion email
  if (project.contacts?.email) {
    try {
      await sendEmail({
        to: project.contacts.email,
        subject: "Project Completion",
        template: "project_completed",
        data: {
          contactName: `${project.contacts.firstName} ${project.contacts.lastName}`,
          propertyAddress: `${project.properties?.street}, ${project.properties?.city}`,
          projectTitle: project.title,
        },
      });
    } catch (error) {
      logger.error("Failed to send completion email:", error);
    }
  }
}

/**
 * Schedule automatic reminders based on tasks due dates
 */
export async function scheduleTaskReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Find tasks due tomorrow
  const dueTasks = await prisma.tasks.findMany({
    where: {
      dueAt: {
        gte: tomorrow,
        lt: dayAfter,
      },
      status: {
        in: ["TODO", "IN_PROGRESS"],
      },
    },
    include: {
      projects: {
        include: {
          contacts: true,
          properties: true,
        },
      },
      users: true,
    },
  });

  // Send reminders for each task
  for (const task of dueTasks) {
    if (task.users?.email) {
      try {
        await sendEmail({
          to: task.users.email,
          subject: "Task Reminder",
          template: "task_reminder",
          data: {
            assigneeName: task.users.name,
            taskTitle: task.title,
            taskDescription: task.description,
            dueDate: task.dueAt,
            projectTitle: task.projects?.title,
            propertyAddress: task.projects?.properties?.street,
          },
        });
      } catch (error) {
        logger.error(`Failed to send task reminder for task ${task.id}:`, error);
      }
    }
  }

  return dueTasks.length;
}

/**
 * Clean up completed tasks older than specified days
 */
export async function cleanupOldTasks(days: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.tasks.deleteMany({
    where: {
      status: "DONE",
      completedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
