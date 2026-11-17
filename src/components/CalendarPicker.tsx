import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";

interface CalendarPickerProps {
  x: number;
  y: number;
  currentDate?: string; // Format: "YYYY-MM-DD"
  onSelectDate: (date?: string) => void;
  onClose: () => void;
}

function formatDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getTodayString(): string {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

function getNextWeekString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  x,
  y,
  currentDate,
  onSelectDate,
  onClose,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month from currentDate or today
  const initialDate = currentDate ? new Date(currentDate + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const nextWeekStr = getNextWeekString();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Constrain coordinates within window bounds
  const adjustedX = Math.max(10, Math.min(x, window.innerWidth - 252));
  const adjustedY = Math.max(10, Math.min(y, window.innerHeight - 350));

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0 is Sun, 1 is Mon... convert to Monday = 0
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const days: Array<{
    day: number;
    month: number;
    year: number;
    dateStr: string;
    isCurrentMonth: boolean;
  }> = [];

  // Trailing days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const yr = viewMonth === 0 ? viewYear - 1 : viewYear;
    days.push({
      day: d,
      month: m,
      year: yr,
      dateStr: formatDateString(yr, m, d),
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    days.push({
      day: i,
      month: viewMonth,
      year: viewYear,
      dateStr: formatDateString(viewYear, viewMonth, i),
      isCurrentMonth: true,
    });
  }

  // Leading days of next month to complete weeks (multiple of 7, up to 35 or 42)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const yr = viewMonth === 11 ? viewYear + 1 : viewYear;
    days.push({
      day: i,
      month: m,
      year: yr,
      dateStr: formatDateString(yr, m, i),
      isCurrentMonth: false,
    });
  }

  return (
    <div
      ref={pickerRef}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        backgroundColor: "var(--card)",
        borderColor: "var(--hairline-bright)",
        color: "var(--text)",
      }}
      className="fixed z-50 w-60 rounded-2xl border shadow-2xl p-3 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2.5"
    >
      {/* Title & Close */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight">
          <CalendarIcon size={14} style={{ color: "var(--accent)" }} />
          <span>Change Date</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ color: "var(--muted)" }}
          className="p-1 rounded-lg hover:text-[var(--text)] hover:bg-white/10 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Quick Preset Buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => {
            onSelectDate(todayStr);
            onClose();
          }}
          style={{
            backgroundColor: currentDate === todayStr ? "var(--accent)" : "var(--input)",
            color: currentDate === todayStr ? "var(--bg)" : "var(--text)",
            borderColor: "var(--hairline)",
          }}
          className="px-2 py-1 rounded-lg border font-medium text-[11px] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-1.5"
        >
          <Clock size={11} />
          <span>Today</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectDate(tomorrowStr);
            onClose();
          }}
          style={{
            backgroundColor: currentDate === tomorrowStr ? "var(--accent)" : "var(--input)",
            color: currentDate === tomorrowStr ? "var(--bg)" : "var(--text)",
            borderColor: "var(--hairline)",
          }}
          className="px-2 py-1 rounded-lg border font-medium text-[11px] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles size={11} />
          <span>Tomorrow</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectDate(nextWeekStr);
            onClose();
          }}
          style={{
            backgroundColor: currentDate === nextWeekStr ? "var(--accent)" : "var(--input)",
            color: currentDate === nextWeekStr ? "var(--bg)" : "var(--text)",
            borderColor: "var(--hairline)",
          }}
          className="px-2 py-1 rounded-lg border font-medium text-[11px] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-1"
        >
          <span>Next Week</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectDate(undefined);
            onClose();
          }}
          style={{
            backgroundColor: "var(--input)",
            color: "var(--muted)",
            borderColor: "var(--hairline)",
          }}
          className="px-2 py-1 rounded-lg border font-medium text-[11px] hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center gap-1"
        >
          <span>No Date</span>
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{ color: "var(--muted)" }}
          className="p-1 rounded-lg hover:text-[var(--text)] hover:bg-white/10 transition-colors"
          title="Previous month"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="font-semibold text-xs tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{ color: "var(--muted)" }}
          className="p-1 rounded-lg hover:text-[var(--text)] hover:bg-white/10 transition-colors"
          title="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center font-medium text-[10px]" style={{ color: "var(--muted)" }}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((item) => {
          const isToday = item.dateStr === todayStr;
          const isSelected = item.dateStr === currentDate;

          return (
            <button
              key={item.dateStr}
              type="button"
              onClick={() => {
                onSelectDate(item.dateStr);
                onClose();
              }}
              style={{
                backgroundColor: isSelected
                  ? "var(--accent)"
                  : isToday
                  ? "var(--accent-soft)"
                  : "transparent",
                color: isSelected
                  ? "var(--bg)"
                  : isToday
                  ? "var(--accent)"
                  : item.isCurrentMonth
                  ? "var(--text)"
                  : "var(--muted)",
                borderColor: isToday && !isSelected ? "var(--accent)" : "transparent",
              }}
              className={`h-7 w-7 mx-auto rounded-lg text-[11px] flex items-center justify-center transition-all ${
                isSelected
                  ? "font-bold shadow-sm"
                  : isToday
                  ? "border font-semibold hover:bg-[var(--accent)] hover:text-[var(--bg)]"
                  : item.isCurrentMonth
                  ? "hover:bg-white/10 font-normal"
                  : "opacity-40 hover:opacity-100 hover:bg-white/5"
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
