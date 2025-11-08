'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {Chip} from "@heroui/react";

/**
* CampaignCalendar Component
* A fully functional calendar with month/year navigation and time display
* 
* @param initialDate - Starting date for the calendar (defaults to current date)
* @param onDateSelect - Callback when a date is clicked
* @param selectedDate - Currently selected date
*/

interface CampaignCalendarProps {
    initialDate?: Date;
    onDateSelect?: (date: Date) => void;
    selectedDate?: Date;
}
    
    const CalendarComponent: React.FC<CampaignCalendarProps> = ({
        initialDate = new Date(),
        onDateSelect,
        selectedDate
    }) => {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Update time every second
    React.useEffect(() => {
        const timer = setInterval(() => {
        setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Day labels
    const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    // Generate calendar days for the current month
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, month, 1);
        const startingDayOfWeek = firstDay.getDay();
        
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Previous month's last days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const days = [];
        
        // Add previous month's days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({
            day: prevMonthLastDay - i,
            isCurrentMonth: false,
            date: new Date(year, month - 1, prevMonthLastDay - i)
        });
        }
        
        // Add current month's days
        for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            isCurrentMonth: true,
            date: new Date(year, month, i)
        });
        }
        
        // Add next month's days to complete the grid
        const remainingDays = 42 - days.length; // 6 rows × 7 days
        for (let i = 1; i <= remainingDays; i++) {
        days.push({
            day: i,
            isCurrentMonth: false,
            date: new Date(year, month + 1, i)
        });
        }
        
        return days;
    }, [currentDate]);
    
    // Navigation handlers
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };
    
    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };
    
    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    // Date selection handler
    const handleDateClick = (date: Date) => {
        if (onDateSelect) {
        onDateSelect(date);
        }
    };
    
    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };
    
    // Check if date is selected
    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };
    
    // Format month and year
    const monthYear = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Format time
    const formatTime = () => {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        const seconds = currentTime.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        return `${displayHours} : ${minutes} : ${seconds} ${ampm}`;
    };
    
    return (
        <Card className="w-[480px] h-[calc(106vh-300px)] shadow-none border border-default-300">
        <CardHeader className="flex justify-between items-center px-4 py-3">
            <h2 className="text-base font-medium">{monthYear}</h2>
            <div className="flex gap-2 items-center">
            <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={goToPreviousMonth}
                aria-label="Previous month"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
                size="sm"
                variant="light"
                onPress={goToToday}
                className="text-sm"
            >
                Today
            </Button>
            <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={goToNextMonth}
                aria-label="Next month"
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
            </div>
        </CardHeader>
        
        <CardBody className="px-4 pb-4">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
            {dayLabels.map((label) => (
                <div
                key={label}
                className="text-center text-xs font-medium text-gray-500 py-2"
                >
                {label}
                </div>
            ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayInfo, index) => {
                const today = isToday(dayInfo.date);
                const selected = isSelected(dayInfo.date);
                
                return (
                <button
                    key={index}
                    onClick={() => handleDateClick(dayInfo.date)}
                    className={`
                    w-12 h-12 flex items-center justify-center rounded-full
                    text-sm transition-all duration-150
                    ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${today ? 'font-bold' : ''}
                    ${selected ? 'bg-black text-white' : 'hover:bg-gray-100'}
                    ${!selected && today ? 'bg-default-300 text-black' : ''}
                    `}
                >
                    {dayInfo.day}
                </button>
                );
            })}
            </div>
            </CardBody>
            
            {/* Time display */}
            <CardFooter className="pt-4">
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-medium text-gray-600">Time</span>
                    <Chip
                        variant="faded"
                        radius="sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">
                                {formatTime()}
                            </span>
                            <span className="text-xs text-gray-500">PHT</span>
                        </div>
                    </Chip>
                </div>
            </CardFooter>
        </Card>
    );
    };
    
    // Example usage
    export default function CampaignCalendar() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        console.log('Selected date:', date.toLocaleDateString());
    };
    
    return (
        <CalendarComponent
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
        />
    );
}