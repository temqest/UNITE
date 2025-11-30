"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";
import { DatePicker } from "@heroui/date-picker";
import { DateValue } from "@react-types/datepicker";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Xmark, TrashBin } from "@gravity-ui/icons";
import { parseDate } from "@internationalized/date";
import { fetchJsonWithAuth } from "../utils/fetchWithAuth";

interface Settings {
  notificationsEnabled: boolean;
  maxPendingRequests: number;
  maxEventsPerDay: number;
  maxBloodBagsPerDay: number;
  advanceBookingDays: number;
  blockedWeekdays: number[];
  blockedDates: string[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    maxPendingRequests: 100,
    maxEventsPerDay: 3,
    maxBloodBagsPerDay: 200,
    advanceBookingDays: 30,
    blockedWeekdays: [1, 0, 0, 0, 0, 0, 1], // Sun and Sat blocked
    blockedDates: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchJsonWithAuth('/api/settings');
      if (response.success) {
        setSettings({
          notificationsEnabled: response.data.notificationsEnabled ?? true,
          maxPendingRequests: response.data.maxPendingRequests ?? 100,
          maxEventsPerDay: response.data.maxEventsPerDay ?? 3,
          maxBloodBagsPerDay: response.data.maxBloodBagsPerDay ?? 200,
          advanceBookingDays: response.data.advanceBookingDays ?? 30,
          blockedWeekdays: response.data.blockedWeekdays ?? [1, 0, 0, 0, 0, 0, 1],
          blockedDates: response.data.blockedDates ?? [],
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unite_token');
    sessionStorage.removeItem('unite_token');
    onClose();
    router.push('/');
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await fetchJsonWithAuth('/api/settings', {
        method: 'POST',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleBlockedDateAdd = (date: DateValue | null) => {
    if (date) {
      const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      if (!settings.blockedDates.includes(dateStr)) {
        updateSettings({ blockedDates: [...settings.blockedDates, dateStr] });
      }
    }
  };

  const handleBlockedDateRemove = (dateStr: string) => {
    updateSettings({ blockedDates: settings.blockedDates.filter(d => d !== dateStr) });
  };

  const handleWeekdayChange = (selected: string[]) => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6].map(day => selected.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day]) ? 1 : 0);
    updateSettings({ blockedWeekdays: weekdays });
  };

  const selectedWeekdays = settings.blockedWeekdays.map((blocked, index) => blocked ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][index] : null).filter(Boolean) as string[];

  const blockedDateValues = settings.blockedDates.map(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return parseDate(`${year}-${month}-${day}`);
  });

  const renderField = (
    label: string,
    description: string,
    value: number,
    key: keyof Settings,
    hasRefresh = false,
  ) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-8">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Input
        aria-label={label}
        className="w-48"
        type="number"
        value={value.toString()}
        onChange={(e) => updateSettings({ [key]: parseInt(e.target.value) || 0 })}
        endContent={
          hasRefresh ? (
            <Button isIconOnly size="sm" variant="light">
              <TrashBin className="h-4 w-4 text-gray-500" />
            </Button>
          ) : undefined
        }
      />
    </div>
  );

  return (
    <Modal
      backdrop="opaque"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Settings</h2>
            </ModalHeader>
            <ModalBody className="p-0">
              <div className="flex">
                {/* Left Sidebar */}
                <div className="w-64 border-r border-gray-200 p-6">
                  <nav className="space-y-1">
                    <a
                      href="#"
                      className="block rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900"
                    >
                      General
                    </a>
                  </nav>
                  <div className="mt-4">
                    <Button
                      color="danger"
                      variant="light"
                      onClick={handleLogout}
                      className="w-full"
                    >
                      Log Out
                    </Button>
                  </div>
                </div>

                {/* Right Content */}
                <div className="flex-1 p-8">
                  <div className="max-w-3xl">
                    {/* Notifications Section */}
                    <section>
                      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Notifications
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Start providing your information by selecting your
                            blood type. Add details below to proceed.
                          </p>
                        </div>
                        <Switch
                          isSelected={settings.notificationsEnabled}
                          onValueChange={(isSelected) => updateSettings({ notificationsEnabled: isSelected })}
                          aria-label="Enable notifications"
                        />
                      </div>
                    </section>

                    {/* Events Section */}
                    <section className="pt-6">
                      <h3 className="text-base font-semibold text-gray-900">
                        Events
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {renderField(
                          "Maximum number of participants",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                          settings.maxPendingRequests,
                          "maxPendingRequests",
                          true,
                        )}
                        {renderField(
                          "Maximum event slot",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                          settings.maxEventsPerDay,
                          "maxEventsPerDay",
                        )}
                        {renderField(
                          "Maximum blood bags per day",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                          settings.maxBloodBagsPerDay,
                          "maxBloodBagsPerDay",
                        )}
                        {renderField(
                          "Minimum days in advance for a request",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                          settings.advanceBookingDays,
                          "advanceBookingDays",
                        )}
                      </div>
                    </section>

                    {/* Calendar Section */}
                    <section className="pt-6">
                      <h3 className="text-base font-semibold text-gray-900">
                        Calendar
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {/* Blocked Operational Days */}
                        <div className="py-4">
                          <h4 className="text-sm font-medium text-gray-900">
                            Blocked operational days
                          </h4>
                          <p className="text-sm text-gray-500">
                            Start providing your information by selecting your
                            blood type. Add details below to proceed.
                          </p>
                          <CheckboxGroup
                            className="mt-4"
                            value={selectedWeekdays}
                            onChange={handleWeekdayChange}
                            orientation="horizontal"
                          >
                            <Checkbox value="sun">Sun</Checkbox>
                            <Checkbox value="mon">Mon</Checkbox>
                            <Checkbox value="tue">Tue</Checkbox>
                            <Checkbox value="wed">Wed</Checkbox>
                            <Checkbox value="thu">Thu</Checkbox>
                            <Checkbox value="fri">Fri</Checkbox>
                            <Checkbox value="sat">Sat</Checkbox>
                          </CheckboxGroup>
                        </div>

                        {/* Specified Blocked Dates */}
                        <div className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                Specified blocked dates
                              </h4>
                              <p className="text-sm text-gray-500">
                                Start providing your information by selecting
                                your blood type. Add details below to proceed.
                              </p>
                            </div>
                            <DatePicker
                              aria-label="Pick a date"
                              hideTimeZone
                              label={null}
                              showMonthAndYearPickers
                              variant="bordered"
                              onChange={handleBlockedDateAdd}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {blockedDateValues.map((date) => (
                              <Chip
                                key={date.toString()}
                                color="danger"
                                endContent={<TrashBin className="h-4 w-4" />}
                                variant="flat"
                                onClose={() => handleBlockedDateRemove(`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`)}
                              >
                                {new Date(
                                  date.year,
                                  date.month - 1,
                                  date.day,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
