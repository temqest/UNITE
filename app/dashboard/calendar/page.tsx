"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/dropdown";
import { 
    Search, 
    ChevronDown, 
    ChevronLeft,
    ChevronRight,
    LogOut, 
    Download, 
    Clock,
    Ticket,
    Calendar,
    CalendarDays,
    SlidersHorizontal,
    Filter
} from "lucide-react";

export default function CalendarPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(26);
  const [selectedEventType, setSelectedEventType] = useState<Set<string> | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 26)); // October 26, 2025
  const [isDateTransitioning, setIsDateTransitioning] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set initial event type in useEffect to ensure it only runs on the client
  useEffect(() => {
    setSelectedEventType(new Set(["blood-drive"]));
  }, []);

  const handleLogout = () => {
    console.log('User logged out');
    setIsDropdownOpen(false);
  };

  // Enhanced date navigation with transitions
  const navigateWeek = async (direction: 'prev' | 'next') => {
    setIsDateTransitioning(true);
    setSlideDirection(direction === 'prev' ? 'right' : 'left');
    
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
    
    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  const navigateMonth = async (direction: 'prev' | 'next') => {
    setIsDateTransitioning(true);
    
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    
    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  // Event type selection handler
  const handleSelectionChange = (keys: any) => {
    const newSelection = new Set<string>();
    if (keys === 'all') {
      // Handle 'all' selection if needed
    } else if (keys) {
      const key = typeof keys === 'string' ? keys : keys.currentKey;
      if (key) {
        newSelection.add(key);
      }
    }
    setSelectedEventType(newSelection);
  };

  // Date formatting functions
  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleString('default', { month: 'long' });
    const endMonth = endOfWeek.toLocaleString('default', { month: 'long' });
    const year = startOfWeek.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Generate days for the current week
  const getDaysForWeek = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      days.push({
        date: dayDate.getDate(),
        day: dayDate.toLocaleString('default', { weekday: 'short' }),
        fullDate: new Date(dayDate),
        isToday: isToday(dayDate),
        month: dayDate.toLocaleString('default', { month: 'short' })
      });
    }
    return days;
  };

  // Helper functions for month view
  const generateMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the week that contains the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End at the last Saturday of the week that contains the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isToday(currentDate),
        events: getEventsForDate(new Date(currentDate))
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const events = [];
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    // Sample events data based on the provided image
    if (month === 9 && year === 2025) { // October 2025
      if (day === 26) {
        events.push({ 
          title: "Lifesavers Blood Drive", 
          time: "8:50 AM",
          type: "training",
          district: "1st District",
          location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
          countType: "Audience Count",
          count: "205 no."
        });
      } else if (day === 27) {
        events.push({ 
          title: "Lifesavers Blood Drive", 
          time: "8:50 AM",
          type: "blood-drive",
          district: "1st District",
          location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
          countType: "Goal Count",
          count: "205 u."
        });
      } else if (day === 28) {
        events.push({ 
          title: "Lifesavers Blood Drive", 
          time: "8:50 AM",
          type: "advocacy",
          district: "1st District",
          location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
          countType: "Audience Count",
          count: "205 no."
        });
      }
    }

    return events;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const days = getDaysForWeek(currentDate);

  // Event type labels and descriptions
  type EventType = keyof {
    "blood-drive": string;
    training: string;
    advocacy: string;
  };

  const eventLabelsMap: Record<EventType, string> = {
    "blood-drive": "Blood Drive",
    "training": "Training",
    "advocacy": "Advocacy"
  };

  const eventDescriptionsMap: Record<EventType, string> = {
    "blood-drive": "Organize a blood donation event",
    "training": "Schedule a training session",
    "advocacy": "Create an advocacy campaign"
  };

  // Get selected event type value
  const selectedEventTypeValue = selectedEventType ? Array.from(selectedEventType)[0] as EventType : undefined;

  // Handle create event button click
  const handleCreateEvent = () => {
    if (selectedEventTypeValue) {
      console.log(`Creating event: ${selectedEventTypeValue}`);
    }
  };

  const handleViewChange = (view: string) => {
    setIsViewTransitioning(true);
    setTimeout(() => {
      setActiveView(view);
      setIsViewTransitioning(false);
    }, 500); // Slower transition (500ms)
  };

  // View transition styles
  const getViewTransitionStyle = (view: string) => {
    const isActive = activeView === view;
    const isTransitioning = isViewTransitioning;
    
    if (isActive && !isTransitioning) {
      return 'opacity-100 scale-100 translate-y-0';
    } else if (isActive && isTransitioning) {
      return view === 'week' 
        ? 'opacity-100 scale-100 translate-y-0' // Current view stays visible during transition
        : 'opacity-100 scale-100 translate-y-0'; // Current view stays visible during transition
    } else if (!isActive && isTransitioning) {
      return view === 'week' 
        ? 'opacity-0 scale-95 -translate-y-4 absolute inset-0 pointer-events-none' // Week fades out and moves up
        : 'opacity-0 scale-95 translate-y-4 absolute inset-0 pointer-events-none'; // Month fades out and moves down
    } else {
      return 'opacity-0 scale-95 absolute inset-0 pointer-events-none'; // Hidden state
    }
  };

  // Slide animation variants for week navigation
  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -100 : 100,
      opacity: 0
    })
  };

  return (
    <div className="flex-1 flex flex-col overflow-visible bg-white relative">
      {/* Header */}
      <header className="relative z-10">
        <div className="px-8 py-7">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          
          {/* Profile and Search Bar Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center mt-12">
              {/* Profile Info with Dropdown */}
              <div className="relative" ref={dropdownRef} style={{ minHeight: '52px' }}>
                <div 
                  className="flex items-center cursor-pointer group"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                    <img 
                      src="/Avatar.png" 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pl-3 pr-3 flex-1">
                    <p className="text-[15px] font-medium text-gray-900 leading-none">Bicol Medical Center</p>
                    <p className="text-[13px] text-gray-500">bmc@gmail.com</p>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-all duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    } group-hover:text-gray-700`} 
                  />
                </div>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+4px)] bg-white rounded-md shadow-lg z-50 border border-gray-200 overflow-hidden"
                    >
                      <motion.button
                        whileHover={{ backgroundColor: '#f9fafb' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 flex items-center whitespace-nowrap"
                      >
                        <motion.span 
                          className="flex items-center"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LogOut className="h-4 w-4 mr-2.5 text-gray-500" />
                          <span>Log out</span>
                        </motion.span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <div className="relative bg-gray-100 rounded-lg border border-gray-300">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="pl-9 pr-20 py-2 w-[200px] text-[13px] border-2 border-transparent bg-transparent rounded-lg focus:outline-none focus:border-gray-900 focus:ring-0 focus:shadow-sm placeholder-gray-400 h-8 transition-all duration-200"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                    <kbd className="text-[10px] font-mono text-gray-500">Win</kbd>
                    <span className="text-[10px] text-gray-400">+</span>
                    <kbd className="text-[10px] font-mono text-gray-500">K</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Toolbar with View Toggle and Actions */}
            <div className="w-full bg-white">
              <div className="flex items-center justify-between px-6 py-3">
                {/* Left side - View Toggle */}
                  <div className="flex items-center gap-4">
                    {/* View Toggle with Icons */}
                    <div className="relative bg-gray-100 rounded-lg p-1 border border-gray-300">
                      <div
                        className={`absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                          activeView === "week" 
                            ? "left-1 right-1/2" 
                            : "left-1/2 right-1"
                        }`}
                      />
                      <div className="relative flex">
                        <button 
                          onClick={() => handleViewChange("week")}
                          className={`relative px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors duration-300 z-10 ${
                            activeView === "week" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <CalendarDays className="w-4 h-4" />
                          Week
                        </button>
                        <button 
                          onClick={() => handleViewChange("month")}
                          className={`relative px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors duration-300 z-10 ${
                            activeView === "month" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          Month
                        </button>
                      </div>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center bg-gray-100 rounded-lg border border-gray-300 px-3 py-2 h-12">
                      <button 
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors duration-200 flex items-center justify-center w-8 h-8"
                        onClick={() => activeView === "week" ? navigateWeek('prev') : navigateMonth('prev')}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-gray-900 font-medium px-4 text-base min-w-[180px] text-center">
                        {activeView === "week" ? formatWeekRange(currentDate) : formatMonthYear(currentDate)}
                      </span>
                      <button 
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors duration-200 flex items-center justify-center w-8 h-8"
                        onClick={() => activeView === "week" ? navigateWeek('next') : navigateMonth('next')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Right side - Action Buttons */}
                  <div className="flex items-center gap-2">

                  {/* Export Button */}
                  <Button
                    variant="faded"
                    startContent={<Download className="w-4 h-4" />}
                    radius="md"
                    size="sm"
                  >
                    Export
                  </Button>

                  {/* Quick Filter Button */}
                  <Button
                    variant="faded"
                    startContent={<Filter className="w-4 h-4" />}
                    endContent={<ChevronDown className="w-4 h-4"/>}
                    radius="md"
                    size="sm"
                  >
                    Quick Filter
                  </Button>

                  {/* Advanced Filter Button */}
                  <Button
                    variant="faded"
                    startContent={<SlidersHorizontal className="w-4 h-4" />}
                    endContent={<ChevronDown className="w-4 h-4"/>}
                    radius="md"
                    size="sm"
                  >
                    Advanced Filter
                  </Button>

                  {/* Create Event Button Group with Dropdown */}
                  <ButtonGroup 
                    variant="solid"
                    radius="md"
                    size="sm"
                  >
                    <Button
                      onPress={handleCreateEvent}
                      color="primary"
                      startContent={<Ticket className="w-4 h-4" />}
                    >
                      {selectedEventTypeValue ? eventLabelsMap[selectedEventTypeValue] : 'Create Event'}
                    </Button>
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button isIconOnly color="primary">
                          <ChevronDown className="w-4 h-4"/>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        disallowEmptySelection
                        aria-label="Event type options"
                        className="max-w-2xl"
                        selectedKeys={selectedEventType || new Set()}
                        selectionMode="single"
                        onSelectionChange={handleSelectionChange}
                      >
                        <DropdownItem key="blood-drive" description={eventDescriptionsMap["blood-drive"]}>
                          {eventLabelsMap["blood-drive"]}
                        </DropdownItem>
                        <DropdownItem key="training" description={eventDescriptionsMap["training"]}>
                          {eventLabelsMap["training"]}
                        </DropdownItem>
                        <DropdownItem key="advocacy" description={eventDescriptionsMap["advocacy"]}>
                          {eventLabelsMap["advocacy"]}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </ButtonGroup>
                </div>
              </div>
            </div>

            {/* Views Container - Both views remain in DOM during transitions */}
            <div className="mt-8 relative min-h-[900px] flex flex-col">
              {/* Week View */}
              <div className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle('week')}`}>
                <div className="mt-8">
                  {/* Days Grid with sliding animation */}
                  <div className="mb-8">
                    {/* Days of Week Header - Fixed position */}
                    <div className="grid grid-cols-7 gap-6 mb-4">
                      {days.map((day, index) => (
                        <div key={`day-${index}`} className="flex justify-center">
                          <div className="w-20 text-center">
                            <span className={`text-xl font-semibold ${
                              selectedDate === day.date ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              {day.day}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Dates with animation */}
                    <div className="relative h-24">
                      <AnimatePresence mode="wait" custom={slideDirection}>
                        <motion.div
                          key={`week-${currentDate.getTime()}`}
                          custom={slideDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="absolute inset-0 grid grid-cols-7 gap-6"
                        >
                          {days.map((day, index) => (
                            <div key={index} className="flex justify-center">
                              <div className="w-20 h-20 flex items-center justify-center">
                                <div className="relative">
                                  {day.isToday && (
                                    <div className="absolute inset-0 bg-red-500 rounded-full" />
                                  )}
                                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold z-10 ${
                                    day.isToday
                                      ? 'text-white'
                                      : selectedDate === day.date
                                      ? 'text-white bg-red-500'
                                      : 'text-gray-900 hover:bg-gray-100'
                                  }`}>
                                    {day.date}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Event Cards with fade transition */}
                  <div className={`transition-all duration-500 ease-in-out flex-1 ${
                    isViewTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                  } ${
                    isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                  }`}>
                    <div className="grid grid-cols-7">
                      {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.fullDate);
                        return (
                          <div 
                            key={index} 
                            className={`relative ${index < 6 ? 'border-r border-gray-200' : ''} px-3`}
                          >
                            {/* Column separator with fixed height */}
                            {index > 0 && (
                              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>
                            )}
                            
                            {/* Events container with scroll */}
                            <div 
                              className={`min-h-[600px] space-y-4 py-1 ${dayEvents.length > 2 ? 'overflow-y-auto pr-2' : ''}`}
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#9ca3af #f3f4f6'
                              }}
                            >
                              {dayEvents.length === 0 ? (
                                <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                                  No events
                                </div>
                              ) : (
                                dayEvents.map((event, eventIndex) => (
                                  <div 
                                    key={eventIndex} 
                                    className="bg-white rounded-xl border border-gray-300 p-4 transition-all duration-200 hover:shadow-md"
                                  >
                                    {/* Event Title */}
                                    <h4 className="font-semibold text-gray-900 text-lg mb-3">{event.title}</h4>
                                    
                                    {/* Profile and Local Government Unit */}
                                    <div className="flex items-start gap-3 mb-4">
                                      <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                                        <img 
                                          src="/Avatar.png" 
                                          alt="Local Government Unit" 
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                      <div>
                                        <h5 className="text-sm font-medium text-gray-700">Local Government Unit</h5>
                                      </div>
                                    </div>

                                    {/* Time and Event Type Container */}
                                    <div className="flex gap-2 mb-4">
                                      {/* Time Badge */}
                                      <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">{event.time}</span>
                                        <Clock className="h-3 w-3 text-gray-500" />
                                      </div>

                                      {/* Event Type Badge */}
                                      <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center">
                                        <span className="text-sm font-medium text-gray-700">{eventLabelsMap[event.type as EventType]}</span>
                                      </div>
                                    </div>

                                    {/* District */}
                                    <div className="mb-3">
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">District</h5>
                                      <p className="text-sm text-gray-600">{event.district}</p>
                                    </div>

                                    {/* Location */}
                                    <div className="mb-4">
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">Location</h5>
                                      <p className="text-sm text-gray-600">{event.location}</p>
                                    </div>

                                    {/* Count Section */}
                                    <div className="border-t border-gray-200 pt-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">{event.countType}</span>
                                        <span className="text-xl font-bold text-red-500">{event.count}</span>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-4">
                                      <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                                        Edit
                                      </button>
                                      <button className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Month View */}
              <div className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle('month')}`}>
                <div className="mt-8">
                  {/* Days of Week Header - Fixed width containers */}
                  <div className="grid grid-cols-7 gap-6 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="flex flex-col items-center">
                        <div className="w-20 text-center">
                          <span className="text-xl font-semibold text-gray-500 pb-4">
                            {day}
                          </span>
                        </div>
                        {/* Empty space to match week view layout */}
                        <div className="w-20 h-20 mt-4"></div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid with fade transition */}
                  <div className={`transition-all duration-500 ease-in-out ${
                    isViewTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  } ${
                    isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                  }`}>
                    <div className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden">
                      <div className="grid grid-cols-7 gap-px bg-gray-200 min-h-[600px]">
                        {generateMonthDays(currentDate).map((day, index) => (
                          <div
                            key={index}
                            className={`min-h-[140px] bg-white p-3 transition-all duration-200 ${
                              day.isCurrentMonth 
                                ? 'hover:bg-gray-50' 
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            {/* Date Number - Fixed height container */}
                            <div className="h-8 flex items-center justify-center mb-2">
                              <div className={`transition-all duration-500 ease-in-out ${
                                isViewTransitioning ? 'opacity-0' : 'opacity-100'
                              }`}>
                                <div className="flex flex-col items-center">
                                  <div className="relative">
                                    {day.isToday && (
                                      <div className="absolute inset-0 bg-red-500 rounded-full" />
                                    )}
                                    <span className={`relative text-xl font-semibold z-10 ${
                                      day.isCurrentMonth 
                                        ? day.isToday
                                          ? 'text-white'
                                          : 'text-gray-900'
                                        : 'text-gray-400'
                                    }`}>
                                      {day.date.getDate()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Events - Positioned below the date number */}
                            <div className="space-y-1">
                              {day.events.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className="text-xs p-1.5 rounded bg-red-100 text-red-800 font-medium truncate cursor-pointer hover:bg-red-200 transition-all duration-200 flex items-center"
                                  title={`${event.time} - ${event.title}`}
                                >
                                  <span className="font-semibold">{event.title}</span>
                                  <span className="text-red-600 ml-2 text-xs opacity-80">{event.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}