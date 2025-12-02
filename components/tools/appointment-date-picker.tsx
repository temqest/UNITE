import {DatePicker} from "@heroui/react";
import {today, isWeekend, getLocalTimeZone, DateValue, getDayOfWeek} from "@internationalized/date";
import {useLocale} from "@react-aria/i18n";
import { useState, useEffect } from 'react';
import { fetchJsonWithAuth } from '../../utils/fetchWithAuth';

interface AppointmentDatePickerProps {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
}

export default function AppointmentDatePicker({ value, onChange }: AppointmentDatePickerProps) {
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [allowWeekendEvents, setAllowWeekendEvents] = useState<boolean>(false);

  let now = today(getLocalTimeZone());

  // No hardcoded disabled ranges by default. If you need ranges, add them to settings and
  // update this component to read and apply them. For now keep empty to avoid unexpected blocks.
  const disabledRanges: Array<[DateValue, DateValue]> = [];

  let {locale} = useLocale();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await fetchJsonWithAuth('/api/settings');

        // Normalize blocked weekdays into numbers 0 (Sunday) .. 6 (Saturday)
        const payload = data && data.data ? data.data : data;

        const rawWeekdays: any[] = payload.blockedWeekdays || [];
        const normalizeWeekday = (w: any): number | null => {
          if (w === null || w === undefined) return null;
          if (typeof w === 'number') {
            if (w >= 0 && w <= 6) return w;
            if (w >= 1 && w <= 7) return w % 7; // 7 -> 0 (Sunday), 1->1, etc.
            return null;
          }
          if (typeof w === 'string') {
            const n = parseInt(w, 10);
            if (!isNaN(n)) {
              if (n >= 0 && n <= 6) return n;
              if (n >= 1 && n <= 7) return n % 7;
            }

            const s = w.trim().toLowerCase();
            const names: Record<string, number> = {
              sunday: 0, sun: 0,
              monday: 1, mon: 1,
              tuesday: 2, tue: 2, tues: 2,
              wednesday: 3, wed: 3,
              thursday: 4, thu: 4, thurs: 4,
              friday: 5, fri: 5,
              saturday: 6, sat: 6,
            };

            if (names[s] !== undefined) return names[s];
          }

          return null;
        };

        let normWeekdays: number[] = [];

        // Support two shapes: an array of 7 flags [sun..sat] (0/1), or a list of weekday ids/names
        if (Array.isArray(rawWeekdays) && rawWeekdays.length === 7 && rawWeekdays.every((x) => x === 0 || x === 1)) {
          normWeekdays = rawWeekdays
            .map((v, idx) => (v ? idx : -1))
            .filter((n) => n >= 0);
        } else {
          normWeekdays = rawWeekdays
            .map(normalizeWeekday)
            .filter((n): n is number => typeof n === 'number');
        }

        // Normalize blocked dates to YYYY-MM-DD strings for reliable comparison
        const rawDates: any[] = payload.blockedDates || [];
        const formatDateValue = (d: DateValue) => {
          const y = String(d.year).padStart(4, '0');
          const m = String(d.month).padStart(2, '0');
          const day = String(d.day).padStart(2, '0');

          return `${y}-${m}-${day}`;
        };

        const normalizeDateString = (inp: any): string | null => {
          if (!inp && inp !== 0) return null;
          if (typeof inp === 'string') {
            // attempt ISO YYYY-MM-DD or full ISO parse
            const isoMatch = inp.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (isoMatch) return inp;

            const tryDate = new Date(inp);
            if (!isNaN(tryDate.getTime())) {
              const y = tryDate.getFullYear();
              const m = String(tryDate.getMonth() + 1).padStart(2, '0');
              const d = String(tryDate.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
          }
          // number (timestamp)
          if (typeof inp === 'number') {
            const dt = new Date(inp);
            if (!isNaN(dt.getTime())) {
              const y = dt.getFullYear();
              const m = String(dt.getMonth() + 1).padStart(2, '0');
              const d = String(dt.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
          }
          return null;
        };

        const normDates = rawDates
          .map(normalizeDateString)
          .filter((s): s is string => typeof s === 'string');

        setBlockedWeekdays(normWeekdays);
        setBlockedDates(normDates);
        setAllowWeekendEvents(Boolean(payload.allowWeekendEvents));

        // Debug logging removed: normalized values are applied to state above.
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const formatDateValue = (d: DateValue) => {
    const y = String(d.year).padStart(4, '0');
    const m = String(d.month).padStart(2, '0');
    const day = String(d.day).padStart(2, '0');

    return `${y}-${m}-${day}`;
  };

  let isDateUnavailable = (date: DateValue) => {
    // block weekends only when weekends are not allowed by settings
    if (!allowWeekendEvents && isWeekend(date, locale)) return true;

    const dow = getDayOfWeek(date, locale); // 0..6
    if (blockedWeekdays.includes(dow)) return true;

    const formatted = formatDateValue(date);
    if (blockedDates.includes(formatted)) return true;

    if (
      disabledRanges.length > 0 &&
      disabledRanges.some(
        (interval) => date.compare(interval[0]) >= 0 && date.compare(interval[1]) <= 0,
      )
    ) {
      return true;
    }

    return false;
  };

  return (
    <DatePicker
      aria-label="Appointment date"
      isDateUnavailable={isDateUnavailable}
      minValue={today(getLocalTimeZone())}
      value={value}
      onChange={onChange}
      classNames={{
        base: "w-full",
        inputWrapper: "border-default-200 h-9 bg-white",
      }}
      granularity="day"
      radius="md"
      size="sm"
      variant="bordered"
    />
  );
}
