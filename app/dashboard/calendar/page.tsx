"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, LogOut, Layout, Grid, Download, Wrench, Filter, Clock } from "lucide-react";

export default function CalendarPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(26); // Default selected date
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

  const handleLogout = () => {
    console.log('User logged out');
    setIsDropdownOpen(false);
  };

  const days = [
    { date: 26, day: 'Su' },
    { date: 27, day: 'Mo' },
    { date: 28, day: 'Tu' },
    { date: 29, day: 'We' },
    { date: 30, day: 'Th' },
    { date: 31, day: 'Fr' },
    { date: 1, day: 'Sa' }
  ];

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
                
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-[-4px] bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center whitespace-nowrap"
                    >
                      <LogOut className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
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

            {/* Filter Toolbar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Week/Month Toggle with Sliding Effect */}
                <div className="relative bg-gray-100 rounded-full p-1">
                  {/* Sliding Background */}
                  <div 
                    className={`absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out ${
                      activeView === "week" 
                        ? "left-1 right-1/2" 
                        : "left-1/2 right-1"
                    }`}
                  />
                  
                  <div className="relative flex">
                    <button 
                      onClick={() => setActiveView("week")}
                      className={`relative px-4 py-2 text-sm font-medium flex items-center transition-colors duration-300 z-10 ${
                        activeView === "week" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      Week
                    </button>
                    <button 
                      onClick={() => setActiveView("month")}
                      className={`relative px-4 py-2 text-sm font-medium flex items-center transition-colors duration-300 z-10 ${
                        activeView === "month" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Grid className="h-4 w-4 mr-2" />
                      Month
                    </button>
                  </div>
                </div>

                {/* Date Navigation */}
                <div className="px-3 py-1">
                  <button className="p-1 text-gray-600 hover:text-gray-900">
                    <span className="text-lg">&lt;</span>
                  </button>
                  <span className="text-gray-900 font-medium px-4">
                    October 26 - October 31,2025
                  </span>
                  <button className="p-1 text-gray-600 hover:text-gray-900">
                    <span className="text-lg">&gt;</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Export Button - No dropdown arrow */}
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>

                {/* Filter Buttons */}
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                    <Filter className="h-4 w-4" />
                    <span>Quick Filter</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                    <Wrench className="h-4 w-4" />
                    <span>Advanced Filter</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-6 mt-12">
              {days.map((day, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  {/* Day Name */}
                  <span className={`text-xl font-semibold transition-colors duration-300 ${
                    selectedDate === day.date
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}>
                    {day.day}
                  </span>
                  {/* Date Number */}
                  <div className="relative">
                    {/* Sliding Background */}
                    <div 
                      className={`absolute inset-0 bg-red-500 rounded-full transition-all duration-300 ease-in-out ${
                        selectedDate === day.date
                          ? 'scale-100 opacity-100'
                          : 'scale-0 opacity-0'
                      }`}
                    />
                    <button
                      onClick={() => setSelectedDate(day.date)}
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold transition-all duration-300 z-10 ${
                        selectedDate === day.date
                          ? 'text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {day.date}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Event Cards Container - One column per day */}
            <div className="mt-12 grid grid-cols-7 gap-4">
              {/* Sunday Column */}
              <div className="space-y-4"></div>

              {/* Monday Column - 1 Card */}
              <div className="space-y-4">
                {/* Event Card */}
                <div className="bg-white rounded-xl border border-gray-300 p-4">
                  {/* Time Container */}
                  <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center gap-2 mb-4">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">8:50 AM</span>
                  </div>

                  {/* Event Details */}
                  <h4 className="font-semibold text-gray-900 text-lg mb-1">Blood Donation Drive</h4>
                  <p className="text-sm text-gray-600 mb-4">BMC Rd, Naga City, Camarines Sur</p>
                  
                  {/* Goal Count and Collected - Side by side */}
                  <div className="space-y-3">
                    {/* Goal Count */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Goal Count</span>
                      <span className="text-xl font-bold text-red-500">205 u.</span>
                    </div>
                    {/* Collected */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Collected</span>
                      <span className="text-xl font-bold text-red-500">100 u.</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                      Edit
                    </button>
                    <button className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Tuesday Column - 2 Cards */}
              <div className="space-y-4">
                {/* Event Card 1 */}
                <div className="bg-white rounded-xl border border-gray-300 p-4">
                  {/* Time Container */}
                  <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center gap-2 mb-4">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">8:50 AM</span>
                  </div>

                  {/* Event Details */}
                  <h4 className="font-semibold text-gray-900 text-lg mb-1">Blood Donation Drive</h4>
                  <p className="text-sm text-gray-600 mb-4">BMC Rd, Naga City, Camarines Sur</p>
                  
                  {/* Goal Count and Collected - Side by side */}
                  <div className="space-y-3">
                    {/* Goal Count */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Goal Count</span>
                      <span className="text-xl font-bold text-red-500">205 u.</span>
                    </div>
                    {/* Collected */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Collected</span>
                      <span className="text-xl font-bold text-red-500">100 u.</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                      Edit
                    </button>
                    <button className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Event Card 2 */}
                <div className="bg-white rounded-xl border border-gray-300 p-4">
                  {/* Time Container */}
                  <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center gap-2 mb-4">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">8:50 AM</span>
                  </div>

                  {/* Event Details */}
                  <h4 className="font-semibold text-gray-900 text-lg mb-1">Blood Donation Drive</h4>
                  <p className="text-sm text-gray-600 mb-4">BMC Rd, Naga City, Camarines Sur</p>
                  
                  {/* Goal Count and Collected - Side by side */}
                  <div className="space-y-3">
                    {/* Goal Count */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Goal Count</span>
                      <span className="text-xl font-bold text-red-500">205 u.</span>
                    </div>
                    {/* Collected */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Collected</span>
                      <span className="text-xl font-bold text-red-500">100 u.</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-2 mt-6">
                    <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                      Edit
                    </button>
                    <button className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Empty columns for other days */}
              <div className="space-y-4">{/* Wednesday */}</div>
              <div className="space-y-4">{/* Thursday */}</div>
              <div className="space-y-4">{/* Friday */}</div>
              <div className="space-y-4">{/* Saturday */}</div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}