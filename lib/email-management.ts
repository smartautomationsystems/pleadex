import prisma from '@/lib/prisma';
import { makeZohoRequest } from './zoho';

export async function checkAndUpdateEmailStatus(userId: string) {
  const userEmail = await prisma.userEmail.findFirst({
    where: { userId },
  });

  if (!userEmail) return;

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // If subscription is inactive for more than 90 days, delete the account
  if (
    userEmail.subscriptionStatus === 'inactive' &&
    userEmail.lastActiveAt < ninetyDaysAgo
  ) {
    await deleteEmailAccount(userId);
    return;
  }

  // If subscription is inactive, suspend the account
  if (userEmail.subscriptionStatus === 'inactive' && userEmail.status === 'active') {
    await suspendEmailAccount(userId);
    return;
  }

  // If subscription is active but account is suspended, reactivate it
  if (userEmail.subscriptionStatus === 'active' && userEmail.status === 'suspended') {
    await reactivateEmailAccount(userId);
    return;
  }
}

export async function suspendEmailAccount(userId: string) {
  const userEmail = await prisma.userEmail.findFirst({
    where: { userId },
  });

  if (!userEmail) return;

  try {
    // Suspend the account in Zoho
    await makeZohoRequest(userId, `/accounts/${userEmail.providerId}/suspend`, {
      method: 'POST',
    });

    // Update status in database
    await prisma.userEmail.update({
      where: { userId },
      data: { status: 'suspended' },
    });
  } catch (error) {
    console.error('Error suspending email account:', error);
    throw new Error('Failed to suspend email account');
  }
}

export async function reactivateEmailAccount(userId: string) {
  const userEmail = await prisma.userEmail.findFirst({
    where: { userId },
  });

  if (!userEmail) return;

  try {
    // Reactivate the account in Zoho
    await makeZohoRequest(userId, `/accounts/${userEmail.providerId}/activate`, {
      method: 'POST',
    });

    // Update status in database
    await prisma.userEmail.update({
      where: { userId },
      data: { status: 'active' },
    });
  } catch (error) {
    console.error('Error reactivating email account:', error);
    throw new Error('Failed to reactivate email account');
  }
}

export async function deleteEmailAccount(userId: string) {
  const userEmail = await prisma.userEmail.findFirst({
    where: { userId },
  });

  if (!userEmail) return;

  try {
    // Delete the account in Zoho
    await makeZohoRequest(userId, `/accounts/${userEmail.providerId}`, {
      method: 'DELETE',
    });

    // Update status in database
    await prisma.userEmail.update({
      where: { userId },
      data: { status: 'deleted' },
    });
  } catch (error) {
    console.error('Error deleting email account:', error);
    throw new Error('Failed to delete email account');
  }
}

export async function updateSubscriptionStatus(
  userId: string,
  status: 'active' | 'inactive',
  expiresAt?: Date
) {
  await prisma.userEmail.update({
    where: { userId },
    data: {
      subscriptionStatus: status,
      subscriptionExpiresAt: expiresAt,
      lastActiveAt: new Date(),
    },
  });

  // Check and update email status based on new subscription status
  await checkAndUpdateEmailStatus(userId);
}

// Function to check all email accounts and update their status
export async function checkAllEmailAccounts() {
  const userEmails = await prisma.userEmail.findMany({
    where: {
      status: { not: 'deleted' },
    },
  });

  for (const userEmail of userEmails) {
    await checkAndUpdateEmailStatus(userEmail.userId);
  }
} 