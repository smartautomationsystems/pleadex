"use client";

import { useState, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View, ToolbarProps } from "react-big-calendar";
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
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

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

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Calendar event clicked:', event);
    onEventClick?.(event);
  };

  const handleDateSelect = (slotInfo: { start: Date; end: Date }) => {
    console.log('Calendar date selected:', slotInfo);
    onDateSelect?.(slotInfo.start, slotInfo.end);
  };

  const handleViewChange = (newView: View) => {
    console.log('Calendar view changed:', newView);
    setView(newView);
  };

  const handleNavigate = (newDate: Date) => {
    console.log('Calendar date changed:', newDate);
    setDate(newDate);
  };

  return (
    <div className="h-[600px] bg-white rounded-lg shadow p-4 relative">
      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleEventClick}
        onSelectSlot={handleDateSelect}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        view={view}
        date={date}
        selectable
        popup
        views={["month", "week", "day"]}
        defaultView="month"
        components={{
          toolbar: CustomToolbar
        }}
      />
    </div>
  );
}

// Custom toolbar component to ensure buttons are clickable
function CustomToolbar(props: ToolbarProps) {
  const goToBack = () => {
    props.onNavigate('PREV');
  };

  const goToNext = () => {
    props.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    props.onNavigate('TODAY');
  };

  const changeView = (view: View) => {
    props.onView(view);
  };

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={goToBack} className="rbc-btn">
          <span className="rbc-btn-content">Back</span>
        </button>
        <button type="button" onClick={goToCurrent} className="rbc-btn">
          <span className="rbc-btn-content">Today</span>
        </button>
        <button type="button" onClick={goToNext} className="rbc-btn">
          <span className="rbc-btn-content">Next</span>
        </button>
      </span>
      <span className="rbc-toolbar-label">{props.label}</span>
      <span className="rbc-btn-group">
        <button 
          type="button" 
          onClick={() => changeView('month')} 
          className={`rbc-btn ${props.view === 'month' ? 'rbc-active' : ''}`}
        >
          <span className="rbc-btn-content">Month</span>
        </button>
        <button 
          type="button" 
          onClick={() => changeView('week')} 
          className={`rbc-btn ${props.view === 'week' ? 'rbc-active' : ''}`}
        >
          <span className="rbc-btn-content">Week</span>
        </button>
        <button 
          type="button" 
          onClick={() => changeView('day')} 
          className={`rbc-btn ${props.view === 'day' ? 'rbc-active' : ''}`}
        >
          <span className="rbc-btn-content">Day</span>
        </button>
      </span>
    </div>
  );
} 