'use client';

import { useSession } from 'next-auth/react';
import Calendar, { CalendarEvent } from '@/components/Calendar';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Placeholder: Fetch real events from API in useEffect
  useEffect(() => {
    // TODO: Replace with real API call
    setEvents([
      {
        _id: '1',
        title: 'Court Hearing: Smith v. Jones',
        start: new Date('2025-05-10'),
        end: new Date('2025-05-10'),
        description: 'Court hearing for Smith v. Jones',
        allDay: true,
        aiSuggested: false,
      },
      {
        _id: '2',
        title: 'Filing Deadline: Johnson v. Lee',
        start: new Date('2025-05-15'),
        end: new Date('2025-05-15'),
        description: 'Filing deadline for Johnson v. Lee',
        allDay: true,
        aiSuggested: true,
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <Calendar events={events} />
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <p>Welcome to your dashboard!</p>
        </div>
      </div>
    </div>
  );
}
