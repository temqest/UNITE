import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CalendarEvent {
  id?: string;
  Event_ID?: string;
  EventId?: string;
  title?: string;
  Event_Title?: string;
  date: Date | string;
  Start_Date?: Date | string;
  End_Date?: Date | string;
  startTime?: string;
  endTime?: string;
  location?: string;
  Location?: string;
  eventType?: string;
  category?: string;
  Category?: string;
  description?: string;
  Event_Description?: string;
  coordinatorName?: string;
  ownerName?: string;
  raw?: any;
  Target_Donation?: number;
  ExpectedAudienceSize?: number;
  MaxParticipants?: number;
  units?: number;
}

interface ExportEvent {
  title: string;
  units: number;
  category: string;
  isSpecial: boolean;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isFirstDayOfWeek: boolean;
  events: ExportEvent[];
}

// Helper function to extract Target_Donation from event (similar to extractCategoryData)
const getTargetDonation = (event: any): number | undefined => {
  const raw = event.raw || event;
  
  // Helper to find value across different locations
  const getVal = (keys: string[]) => {
    // Check categoryData first (backend returns it directly)
    if (raw.categoryData) {
      for (const k of keys) {
        if (raw.categoryData[k] !== undefined && raw.categoryData[k] !== null) {
          return raw.categoryData[k];
        }
      }
    }
    // Check direct properties
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) {
        return raw[k];
      }
    }
    return undefined;
  };
  
  return getVal(['Target_Donation', 'TargetDonation', 'Target_Donations']);
};

// Helper function to determine if event is blood drive
const isBloodDrive = (event: any): boolean => {
  const raw = event.raw || event;
  const category = (raw.Category || raw.category || raw.categoryType || '').toString().toLowerCase();
  return category.includes('blood') || category === 'blooddrive';
};

// Helper function to transform events for export
const transformEventsForExport = (monthEventsByDate: Record<string, any[]>): Record<string, ExportEvent[]> => {
  const transformed: Record<string, ExportEvent[]> = {};
  
  Object.entries(monthEventsByDate).forEach(([dateKey, events]) => {
    transformed[dateKey] = events.map((event: any) => {
      const raw = event.raw || event;
      const title = raw.Event_Title || raw.title || raw.EventTitle || 'Untitled Event';
      
      // Determine category
      const category = raw.Category || raw.category || raw.categoryType || 'Event';
      const categoryLower = category.toString().toLowerCase();
      const isBloodDriveEvent = categoryLower.includes('blood') || categoryLower === 'blooddrive';
      
      // Extract units - only Target_Donation for blood drives, 0 for others
      let units = 0;
      if (isBloodDriveEvent) {
        const targetDonation = getTargetDonation(event);
        units = targetDonation !== undefined ? Number(targetDonation) : 0;
      }
      
      // Determine if special event (red background) - typically large events or special types
      const isSpecial = units >= 200 || 
                       title.toLowerCase().includes('relaunch') ||
                       title.toLowerCase().includes('meeting') ||
                       categoryLower.includes('special');
      
      return {
        title,
        units, // Only blood drive Target_Donation, 0 for others
        category,
        isSpecial,
      };
    });
  });
  
  return transformed;
};

// Helper function to build calendar grid
const buildCalendarGrid = (
  currentDate: Date,
  eventsByDate: Record<string, ExportEvent[]>
): CalendarDay[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get first day of week for the first day of month (0 = Sunday)
  const startDayOfWeek = firstDay.getDay();
  
  // Calculate start date (include previous month days to fill first week)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDayOfWeek);
  
  // Calculate end date (include next month days to fill last week)
  const endDate = new Date(lastDay);
  const endDayOfWeek = lastDay.getDay();
  const daysToAdd = 6 - endDayOfWeek;
  endDate.setDate(endDate.getDate() + daysToAdd);
  
  const days: CalendarDay[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const dayOfWeek = current.getDay();
    const isFirstDayOfWeek = dayOfWeek === 1; // Monday (first day of week in reference)
    const isCurrentMonth = current.getMonth() === month;
    
    days.push({
      date: new Date(current),
      dayNumber: current.getDate(),
      isCurrentMonth,
      isFirstDayOfWeek,
      events: eventsByDate[dateKey] || [],
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return days;
};

// Helper function to calculate weekly totals (only blood drive events)
const calculateWeeklyTotals = (weeks: CalendarDay[][]): number[] => {
  return weeks.map(week => {
    return week.reduce((weekTotal, day) => {
      // Only sum units from blood drive events
      const dayTotal = day.events.reduce((sum, event) => {
        // Only count if it's a blood drive event (has units > 0 means it's a blood drive)
        // Units will be 0 for non-blood-drive events
        return sum + event.units;
      }, 0);
      return weekTotal + dayTotal;
    }, 0);
  });
};

// Helper function to generate complete HTML
const generateCalendarHTML = (
  eventsByDate: Record<string, ExportEvent[]>,
  currentDate: Date,
  organizationName: string = 'Bicol Transfusion Service Centre'
): string => {
  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = buildCalendarGrid(currentDate, eventsByDate);
  
  // Group days into weeks (rows)
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];
  
  days.forEach((day, index) => {
    currentWeek.push(day);
    if (day.date.getDay() === 6 || index === days.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // Calculate weekly totals after grouping into weeks (only blood drive events)
  const weeklyTotals = calculateWeeklyTotals(weeks);
  
  // Build day headers HTML (Sunday is implied but not labeled in reference)
  const dayHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayHeadersHTML = `<th class="day-header"></th>` + dayHeaders.map(day => `<th class="day-header">${day}</th>`).join('');
  
  // Build calendar rows HTML
  let calendarRowsHTML = '';
  let totalWeekIndex = 0;
  
  weeks.forEach((week, weekIndex) => {
    calendarRowsHTML += '<tr>';
    
    week.forEach((day) => {
      const dateClass = day.isCurrentMonth ? 'date-current' : 'date-other';
      const dateColorClass = day.isFirstDayOfWeek ? 'date-first-week' : '';
      const eventsHTML = day.events.map(event => {
        const eventClass = event.isSpecial ? 'event-special' : 'event-regular';
        // Only show units for blood drive events (units > 0 means it's a blood drive)
        const unitsText = event.units > 0 ? ` - ${event.units}` : '';
        return `<div class="event-block ${eventClass}">${event.title}${unitsText}</div>`;
      }).join('');
      
      calendarRowsHTML += `
        <td class="calendar-cell ${dateClass}">
          <div class="date-number ${dateColorClass}">${day.dayNumber}</div>
          <div class="events-container">${eventsHTML}</div>
        </td>
      `;
    });
    
    // Add TOTAL column (only blood drive totals)
    const weekTotal = weeklyTotals[totalWeekIndex] || 0;
    calendarRowsHTML += `<td class="total-sc-cell">${weekTotal > 0 ? weekTotal.toLocaleString() : ''}</td>`;
    totalWeekIndex++;
    
    calendarRowsHTML += '</tr>';
  });
  
  // Calculate grand total (only blood drive events)
  const grandTotal = days.reduce((sum, day) => {
    return sum + day.events.reduce((daySum, event) => {
      // Only count blood drive events (units > 0 means it's a blood drive)
      return daySum + event.units;
    }, 0);
  }, 0);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Export - ${monthYear}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 5mm;
      background: white;
      margin: 0;
    }
    
    .calendar-container {
      width: 100%;
      max-width: 100%;
      padding: 0 5mm;
      box-sizing: border-box;
    }
    
    .calendar-header {
      margin-bottom: 20px;
    }
    
    .month-year {
      font-size: 24px;
      font-weight: bold;
      color: #000;
      margin-bottom: 5px;
    }
    
    .organization-name {
      font-size: 18px;
      font-weight: bold;
      color: #d32f2f;
      margin-bottom: 20px;
    }
    
    .calendar-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #ddd;
      table-layout: fixed;
    }
    
    .day-header {
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: center;
      padding: 8px 4px;
      border: 1px solid #ddd;
      font-size: 11px;
    }
    
    .calendar-cell {
      border: 1px solid #ddd;
      padding: 4px;
      min-height: 70px;
      vertical-align: top;
      width: calc((100% - 80px) / 7); /* Adjust for TOTAL column */
      background-color: #fff;
    }
    
    .date-other {
      background-color: #f9f9f9;
    }
    
    .date-number {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 14px;
    }
    
    .date-first-week {
      color: #d32f2f;
    }
    
    .date-current .date-number {
      color: #000;
    }
    
    .date-other .date-number {
      color: #999;
    }
    
    .events-container {
      min-height: 50px;
    }
    
    .event-block {
      padding: 3px 5px;
      margin: 2px 0;
      border-radius: 3px;
      font-size: 10px;
      line-height: 1.2;
      word-wrap: break-word;
      overflow: hidden;
    }
    
    .event-regular {
      background-color: #fff9c4;
      color: #000;
    }
    
    .event-special {
      background-color: #ffcdd2;
      color: #000;
      font-weight: bold;
    }
    
    .total-sc-cell {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: right;
      font-weight: bold;
      background-color: #f5f5f5;
      width: 80px;
      min-width: 80px;
    }
    
    .calendar-footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
      page-break-inside: avoid;
      padding-bottom: 20px;
    }
    
    .footer-total {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .footer-label {
      font-size: 14px;
      color: #666;
    }
    
    @media print {
      body {
        padding: 5mm;
        margin: 0;
      }
      
      .calendar-container {
        padding: 0;
      }
      
      .calendar-table {
        page-break-inside: auto;
      }
      
      .calendar-cell {
        page-break-inside: avoid;
      }
      
      .calendar-footer {
        page-break-inside: avoid;
        page-break-before: avoid;
      }
      
      @page {
        size: A4 landscape;
        margin: 5mm;
      }
    }
  </style>
</head>
<body>
  <div class="calendar-container">
    <div class="calendar-header">
      <div class="month-year">${monthYear}</div>
      <div class="organization-name">${organizationName}</div>
    </div>
    
    <table class="calendar-table">
      <thead>
        <tr>
          ${dayHeadersHTML}
          <th class="total-sc-cell">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${calendarRowsHTML}
      </tbody>
    </table>
    
    <div class="calendar-footer">
      <div class="footer-total">GRAND TOTAL ESTIMATED COLLECTION: ${grandTotal.toLocaleString()}</div>
      <div class="footer-label">Monthly Target Collection</div>
    </div>
  </div>
</body>
</html>`;
  
  return html;
};

// Helper function to generate PDF from HTML using html2canvas
const generatePDFFromHTML = async (
  htmlContent: string,
  filename: string,
  currentDate: Date
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '297mm'; // A4 landscape width
      container.style.padding = '0';
      container.style.margin = '0';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      // Wait for DOM to be ready, then capture
      setTimeout(async () => {
        try {
          const calendarElement = container.querySelector('.calendar-container') as HTMLElement;
          
          if (!calendarElement) {
            throw new Error('Calendar element not found');
          }
          
          // Capture the element as canvas with high quality
          const canvas = await html2canvas(calendarElement, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1122, // A4 landscape width in pixels at 96 DPI (297mm)
            windowHeight: calendarElement.scrollHeight,
          });
          
          // Remove the temporary container
          document.body.removeChild(container);
          
          // Create PDF with A4 landscape orientation
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
          });
          
          // A4 landscape dimensions with margins
          const pageWidth = 297; // A4 landscape width in mm
          const pageHeight = 210; // A4 landscape height in mm
          const margin = 5; // 5mm margins
          const contentWidth = pageWidth - (2 * margin); // Available width
          
          // Calculate scaled image dimensions to fit within margins
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Add image to PDF with margins
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
          
          // Save the PDF
          const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
          pdf.save(`${filename || `calendar-${monthYear.replace(' ', '-').toLowerCase()}`}.pdf`);
          
          resolve();
        } catch (error) {
          // Clean up on error
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          reject(error);
        }
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
};

export const useCalendarExport = () => {
  const exportVisualPDF = useCallback(async (
    monthEventsByDate: Record<string, any[]>,
    currentDate: Date,
    organizationName?: string
  ) => {
    try {
      // Transform events for export
      const transformedEvents = transformEventsForExport(monthEventsByDate);
      
      // Generate HTML calendar
      const htmlContent = generateCalendarHTML(
        transformedEvents,
        currentDate,
        organizationName || 'Bicol Transfusion Service Centre'
      );
      
      // Generate PDF from HTML using html2canvas
      const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      const filename = `calendar-${monthYear.replace(' ', '-').toLowerCase()}`;
      await generatePDFFromHTML(htmlContent, filename, currentDate);
      
      return { success: true };
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }, []);

  const exportOrganizedPDF = useCallback((events: CalendarEvent[], monthYear: string, filename: string) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Calendar Events - ${monthYear}`, margin, yPosition);
      yPosition += 15;

      // Check if there are any events
      if (!events || events.length === 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('No events scheduled for this month.', margin, yPosition);
        pdf.save(`${filename}.pdf`);
        return { success: true };
      }

      // Transform and sort events by date
      const transformedEvents = events.map((event) => {
        const raw = event.raw || event;
        return {
          id: event.Event_ID || event.EventId || event.id || '',
          title: event.Event_Title || event.title || 'Untitled Event',
          date: event.Start_Date || event.date,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          location: event.Location || event.location || 'TBA',
          eventType: event.Category || event.category || event.eventType || 'Event',
          description: event.Event_Description || event.description || '',
          coordinator: event.coordinatorName || event.ownerName || '',
        };
      });

      const sortedEvents = transformedEvents.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      // Group events by date
      const eventsByDate = sortedEvents.reduce((acc, event) => {
        const dateKey = new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
      }, {} as Record<string, typeof transformedEvents>);

      // Render events grouped by date
      Object.entries(eventsByDate).forEach(([date, dateEvents]) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Date header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(date, margin, yPosition);
        yPosition += 10;

        // Events for this date
        dateEvents.forEach((event, index) => {
          if (yPosition > pageHeight - 60) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');

          // Event title
          pdf.setFont('helvetica', 'bold');
          const titleText = `${index + 1}. ${event.title}`;
          const titleLines = pdf.splitTextToSize(titleText, pageWidth - margin * 2);
          titleLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 5, yPosition);
            yPosition += 6;
          });

          // Event details
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);

          if (event.startTime || event.endTime) {
            const timeText = `Time: ${event.startTime || 'N/A'} - ${event.endTime || 'N/A'}`;
            pdf.text(timeText, margin + 10, yPosition);
            yPosition += 5;
          }

          if (event.location) {
            const locationLines = pdf.splitTextToSize(`Location: ${event.location}`, pageWidth - margin * 2 - 10);
            locationLines.forEach((line: string) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin + 10, yPosition);
              yPosition += 5;
            });
          }

          if (event.eventType) {
            pdf.text(`Type: ${event.eventType}`, margin + 10, yPosition);
            yPosition += 5;
          }

          if (event.coordinator) {
            const coordLines = pdf.splitTextToSize(`Coordinator: ${event.coordinator}`, pageWidth - margin * 2 - 10);
            coordLines.forEach((line: string) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin + 10, yPosition);
              yPosition += 5;
            });
          }

          if (event.description) {
            const descLines = pdf.splitTextToSize(`Description: ${event.description}`, pageWidth - margin * 2 - 10);
            descLines.forEach((line: string) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin + 10, yPosition);
              yPosition += 5;
            });
          }

          yPosition += 8; // Space between events
        });

        yPosition += 5; // Space between dates
      });

      // Footer with page numbers
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`${filename}.pdf`);
      return { success: true };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error };
    }
  }, []);

  return { exportVisualPDF, exportOrganizedPDF };
};
