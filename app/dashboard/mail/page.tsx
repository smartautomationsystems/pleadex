import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import EmailForm from './EmailForm';

export default async function MailPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const { db } = await connectToDatabase();
  const userEmail = await db.collection('userEmails').findOne({ userId: session.user.id });

  if (userEmail?.email) {
    redirect('/dashboard/mail/inbox');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Settings</h1>
      <div className="bg-base-100 p-6 rounded-lg shadow-sm">
        <EmailForm />
      </div>
    </div>
  );
} 