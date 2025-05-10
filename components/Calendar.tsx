"use client";

import { useState, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface CalendarEvent {
  _id?: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  allDay?: boolean;
  aiSuggested?: boolean;
  type?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (start: Date, end: Date) => void;
}

export default function Calendar({ events, onEventClick, onDateSelect }: CalendarProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    setCalendarEvents(events);
  }, [events]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let style: any = {
      backgroundColor: event.aiSuggested ? "#f59e0b" : "#3b82f6",
      borderRadius: "5px",
      opacity: 0.9,
      color: "white",
      border: "none",
      display: "block",
    };
    return { style };
  };

  return (
    <div className="h-[600px] bg-white rounded-lg shadow p-4">
      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={onEventClick}
        onSelectSlot={({ start, end }) => onDateSelect && onDateSelect(start, end)}
        selectable
        popup
        views={["month", "week", "day"]}
        defaultView="month"
      />
    </div>
  );
} 