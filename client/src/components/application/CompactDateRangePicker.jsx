import React, { useState, useEffect, useRef, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatDisplayDate(ymd) {
  if (!ymd || typeof ymd !== "string") return "";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

function parseYmd(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toYmd(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CompactDateRangePicker({
  departureDate = "",
  returnDate = "",
  minDate = "",
  departureLabel = "DEPARTURE",
  returnLabel = "RETURN",
  departurePlaceholder = "dd-mm-yyyy",
  returnPlaceholder = "dd-mm-yyyy",
  onDateChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState("from"); // "from" | "to"
  const [hoverDate, setHoverDate] = useState(null);

  const containerRef = useRef(null);

  const todayStr = useMemo(() => {
    return toYmd(new Date());
  }, []);

  const effectiveMin = minDate || todayStr;

  // Initialize viewMonth to departureDate's month or current month
  const [viewMonth, setViewMonth] = useState(() => {
    if (departureDate) {
      const parsed = parseYmd(departureDate);
      if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // When departureDate changes externally, sync viewMonth if closed
  useEffect(() => {
    if (!isOpen && departureDate) {
      const parsed = parseYmd(departureDate);
      if (parsed) setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [departureDate, isOpen]);

  // Click outside and escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoverDate(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setHoverDate(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = (field) => {
    setActiveField(field);
    if (!isOpen) {
      setIsOpen(true);
      const baseDate = field === "to" && returnDate ? returnDate : departureDate;
      if (baseDate) {
        const parsed = parseYmd(baseDate);
        if (parsed) setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  };

  const handlePrevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Determine if previous navigation should be disabled
  const isPrevDisabled = useMemo(() => {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return viewMonth <= currentMonthStart;
  }, [viewMonth]);

  // Generate calendar grid for the current viewMonth
  const monthData = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // In Monday-first system: Monday = 0, Sunday = 6
    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7;

    const cells = [];

    // Leading empty cells
    for (let i = 0; i < offset; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = dateStr < effectiveMin;
      const isToday = dateStr === todayStr;
      const isStart = dateStr === departureDate;
      const isEnd = dateStr === returnDate;

      // Range evaluation (works smoothly across month boundaries)
      const effectiveEnd = returnDate || (activeField === "to" && hoverDate && hoverDate >= departureDate ? hoverDate : null);
      const isInRange = Boolean(departureDate && effectiveEnd && dateStr > departureDate && dateStr < effectiveEnd);
      const isHoverTarget = Boolean(!returnDate && activeField === "to" && hoverDate && dateStr === hoverDate && dateStr > departureDate);

      // Connecting bars
      const hasRightBar = Boolean(isStart && effectiveEnd && effectiveEnd > departureDate);
      const hasLeftBar = Boolean((isEnd || isHoverTarget) && departureDate && (returnDate || hoverDate) > departureDate);

      cells.push({
        empty: false,
        key: dateStr,
        dayNumber: d,
        dateStr,
        isPast,
        isToday,
        isStart,
        isEnd,
        isInRange,
        isHoverTarget,
        hasRightBar,
        hasLeftBar
      });
    }

    // Trailing empty cells to complete the 7-column row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const trailing = 7 - remainder;
      for (let i = 0; i < trailing; i++) {
        cells.push({ empty: true, key: `trailing-${i}` });
      }
    }

    return {
      year,
      month,
      title: `${MONTH_NAMES[month]} ${year}`,
      cells
    };
  }, [viewMonth, departureDate, returnDate, hoverDate, activeField, effectiveMin, todayStr]);

  const handleDayClick = (cell) => {
    if (cell.isPast) return;
    const clicked = cell.dateStr;

    if (activeField === "from") {
      onDateChange("departure", clicked);
      if (returnDate && returnDate < clicked) {
        onDateChange("return", "");
      }
      setActiveField("to");
    } else {
      // activeField is "to"
      if (!departureDate) {
        onDateChange("departure", clicked);
        setActiveField("to");
      } else if (clicked < departureDate) {
        onDateChange("departure", clicked);
        onDateChange("return", "");
        setActiveField("to");
      } else {
        onDateChange("return", clicked);
        setHoverDate(null);
      }
    }
  };

  const handleClear = () => {
    onDateChange("departure", "");
    onDateChange("return", "");
    setActiveField("from");
    setHoverDate(null);
  };

  const handleSelectToday = () => {
    onDateChange("departure", todayStr);
    if (returnDate && returnDate < todayStr) {
      onDateChange("return", "");
    }
    setActiveField("to");
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Duration calculation
  const durationInfo = useMemo(() => {
    if (!departureDate || !returnDate) return null;
    const d1 = parseYmd(departureDate);
    const d2 = parseYmd(returnDate);
    if (!d1 || !d2) return null;
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime < 0) return null;
    const nights = Math.round(diffTime / (1000 * 3600 * 24));
    const days = nights + 1;
    if (nights === 0) return "1 Day";
    return `${days} Days • ${nights} ${nights === 1 ? "Night" : "Nights"}`;
  }, [departureDate, returnDate]);

  return (
    <div className="ca-date-picker-wrap" ref={containerRef}>
      {/* Two input triggers matching existing layout */}
      <div className="ca-date-grid">
        <div className="ca-field">
          <label htmlFor="ca-departure">{departureLabel}</label>
          <button
            type="button"
            id="ca-departure"
            className={`ca-input ca-date-trigger ${isOpen && activeField === "from" ? "is-active" : ""}`}
            onClick={() => handleOpen("from")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <span className={departureDate ? "ca-date-val" : "ca-date-ph"}>
              {formatDisplayDate(departureDate) || departurePlaceholder}
            </span>
            <CalendarDays size={18} className="ca-date-icon" />
          </button>
        </div>

        <div className="ca-field">
          <label htmlFor="ca-return">{returnLabel}</label>
          <button
            type="button"
            id="ca-return"
            className={`ca-input ca-date-trigger ${isOpen && activeField === "to" ? "is-active" : ""}`}
            onClick={() => handleOpen("to")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <span className={returnDate ? "ca-date-val" : "ca-date-ph"}>
              {formatDisplayDate(returnDate) || returnPlaceholder}
            </span>
            <CalendarDays size={18} className="ca-date-icon" />
          </button>
        </div>
      </div>

      {/* Popover Calendar - Perfectly fit to card container */}
      {isOpen && (
        <div className="ca-calendar-popover" role="dialog" aria-modal="true">
          {/* Active picking indicator */}
          <div className="ca-cal-picking-status">
            <span className={activeField === "from" ? "is-active-tab" : ""} onClick={() => setActiveField("from")}>
              Departure: <b>{formatDisplayDate(departureDate) || "Select date"}</b>
            </span>
            <span className="ca-cal-status-sep">→</span>
            <span className={activeField === "to" ? "is-active-tab" : ""} onClick={() => setActiveField("to")}>
              Return: <b>{formatDisplayDate(returnDate) || "Select date"}</b>
            </span>
          </div>

          {/* Month Header with Navigation */}
          <div className="ca-cal-header-row">
            <button
              type="button"
              className="ca-cal-nav-btn"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="ca-cal-month-title">{monthData.title}</div>

            <button
              type="button"
              className="ca-cal-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="ca-cal-weekdays">
            {WEEKDAYS.map((day) => (
              <div key={day} className="ca-cal-weekday">{day}</div>
            ))}
          </div>

          {/* Date Grid */}
          <div
            className="ca-cal-grid"
            onMouseLeave={() => setHoverDate(null)}
          >
            {monthData.cells.map((cell) => {
              if (cell.empty) {
                return <div key={cell.key} className="ca-cal-cell is-empty" />;
              }

              const isSelected = cell.isStart || cell.isEnd;

              return (
                <div
                  key={cell.key}
                  className={`ca-cal-cell ${cell.isInRange ? "is-in-range" : ""} ${cell.hasRightBar ? "has-right-bar" : ""} ${cell.hasLeftBar ? "has-left-bar" : ""}`}
                >
                  {/* Range background strip connecting consecutive days */}
                  {cell.isInRange && <div className="ca-cal-bar ca-cal-bar-full" />}
                  {cell.hasRightBar && <div className="ca-cal-bar ca-cal-bar-right" />}
                  {cell.hasLeftBar && <div className="ca-cal-bar ca-cal-bar-left" />}

                  <button
                    type="button"
                    className={`ca-cal-day-btn ${isSelected ? "is-selected" : ""} ${cell.isHoverTarget ? "is-hover-target" : ""} ${cell.isPast ? "is-past" : ""} ${cell.isToday && !isSelected ? "is-today" : ""}`}
                    disabled={cell.isPast}
                    onClick={() => handleDayClick(cell)}
                    onMouseEnter={() => {
                      if (activeField === "to" && departureDate && cell.dateStr >= departureDate) {
                        setHoverDate(cell.dateStr);
                      }
                    }}
                  >
                    <span>{cell.dayNumber}</span>
                    {cell.isToday && !isSelected && <span className="ca-cal-today-dot" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Calendar Footer */}
          <div className="ca-cal-footer">
            <div className="ca-cal-footer-left">
              <button
                type="button"
                className="ca-cal-action-btn"
                onClick={handleClear}
                disabled={!departureDate && !returnDate}
              >
                Clear
              </button>
              <button
                type="button"
                className="ca-cal-action-btn"
                onClick={handleSelectToday}
              >
                Today
              </button>
              {durationInfo && (
                <div className="ca-cal-duration-pill">
                  {durationInfo}
                </div>
              )}
            </div>

            <div className="ca-cal-footer-right">
              <button
                type="button"
                className="ca-cal-done-btn"
                onClick={() => {
                  setIsOpen(false);
                  setHoverDate(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
