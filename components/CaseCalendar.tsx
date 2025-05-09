import React, { useState } from 'react';

// Mock case events (replace with real data as needed)
const caseEvents = [
  { date: '2025-05-10', title: 'Court Hearing: Smith v. Jones' },
  { date: '2025-05-15', title: 'Filing Deadline: Johnson v. Lee' },
  { date: '2025-05-22', title: 'Mediation: Brown v. Davis' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CaseCalendar() {
  // Set initial month/year to the first event if available, else today
  const firstEvent = caseEvents[0] ? new Date(caseEvents[0].date) : new Date();
  const [currentMonth, setCurrentMonth] = useState(firstEvent.getMonth());
  const [currentYear, setCurrentYear] = useState(firstEvent.getFullYear());
  const [selectedEvent, setSelectedEvent] = useState<{date: string, title: string} | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Get events for the current month
  const eventsThisMonth = caseEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <div className="flex justify-between items-center mb-2">
          <button className="btn btn-xs" onClick={handlePrevMonth}>&lt;</button>
          <h2 className="card-title">{monthName} {currentYear}</h2>
          <button className="btn btn-xs" onClick={handleNextMonth}>&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-2">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={i} className="p-2" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const event = caseEvents.find(e => e.date === dateStr);
            return (
              <div
                key={day}
                className={`p-2 rounded cursor-pointer ${event ? 'bg-primary text-primary-content font-bold' : 'hover:bg-base-200'}`}
                title={event ? event.title : ''}
                onClick={() => event && setSelectedEvent(event)}
              >
                {day}
              </div>
            );
          })}
        </div>
        {eventsThisMonth.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2">Important Dates:</h3>
            <ul className="text-xs">
              {eventsThisMonth.map(e => (
                <li key={e.date} className="mb-1">
                  <span className="font-bold">{new Date(e.date).toLocaleDateString()}</span>: {e.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedEvent && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[250px]" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2">Event Details</h3>
              <div className="mb-2"><span className="font-semibold">Date:</span> {new Date(selectedEvent.date).toLocaleDateString()}</div>
              <div className="mb-4"><span className="font-semibold">Title:</span> {selectedEvent.title}</div>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 