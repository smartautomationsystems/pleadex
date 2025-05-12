'use client';

import { useSession } from 'next-auth/react';
import Calendar, { CalendarEvent } from '@/components/Calendar';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    toast.success(`Selected: ${event.title}`);
  };

  const handleDateSelect = (start: Date, end: Date) => {
    console.log('Date selected:', { start, end });
    // TODO: Implement date selection handler
  };

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
      <Calendar 
        events={events} 
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
      />
      {selectedEvent && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{selectedEvent.title}</h2>
            <p className="text-sm text-gray-600">
              {selectedEvent.start.toLocaleDateString()}
            </p>
            {selectedEvent.description && (
              <p className="mt-2">{selectedEvent.description}</p>
            )}
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <p>Welcome to your dashboard!</p>
        </div>
      </div>
    </div>
  );
}
