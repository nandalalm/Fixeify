import jsPDF from 'jspdf';
import { BookingCompleteResponse } from '../interfaces/bookingInterface';
import { QuotaResponse } from '../interfaces/quotaInterface';

const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return '0';
  const num = Math.round(Number(amount));
  return num.toLocaleString('en-IN');
};

const to12h = (time?: string): string => {
  if (!time) return '-';
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, '0');
  return `${hour12}:${mm} ${period}`;
};

interface InvoiceData {
  booking: BookingCompleteResponse;
  quota: QuotaResponse;
}

export const generateInvoice = (data: InvoiceData): void => {
  const { booking, quota } = data;
  const pdf = new jsPDF();
  
  const primaryColor = '#032b44';
  const lightGray = '#f5f5f5';
  const darkGray = '#333333';
  
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = 20;
  
  const addText = (text: string, x: number, y: number, options?: { align?: "left" | "center" | "right" | "justify"; maxWidth?: number }) => {
    pdf.text(text, x, y, options);
  };
  
  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    pdf.line(x1, y1, x2, y2);
  };
  
  const drawRect = (x: number, y: number, width: number, height: number, fill?: boolean) => {
    if (fill) {
      pdf.rect(x, y, width, height, 'F');
    } else {
      pdf.rect(x, y, width, height);
    }
  };

  pdf.setFillColor(primaryColor);
  drawRect(0, 0, pageWidth, 40, true);
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  addText('FIXEIFY', margin, 25);
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  addText('SERVICE INVOICE', pageWidth - margin - 60, 25);
  
  yPosition = 60;
  
  pdf.setTextColor(darkGray);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  
  pdf.setFillColor(lightGray);
  drawRect(margin, yPosition, contentWidth, 30, true);
  
  pdf.setTextColor(0, 0, 0);
  addText('INVOICE DETAILS', margin + 5, yPosition + 10);
  
  yPosition += 20;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  
  const bookingNumber = booking.bookingId || booking.id || '';
  const invoiceDate = new Date().toLocaleDateString('en-IN');
  const serviceDate = new Date(booking.preferredDate).toLocaleDateString('en-IN');
  
  addText(`Booking Number: ${bookingNumber}`, margin + 5, yPosition + 5);
  addText(`Invoice Date: ${invoiceDate}`, margin + 5, yPosition + 15);
  addText(`Service Date: ${serviceDate}`, pageWidth - margin - 80, yPosition + 5);
  addText(`Status: ${booking.status.toUpperCase()}`, pageWidth - margin - 80, yPosition + 15);
  
  yPosition += 40;
  
  pdf.setFillColor(lightGray);
  drawRect(margin, yPosition, contentWidth / 2 - 5, 60, true);
  drawRect(margin + contentWidth / 2 + 5, yPosition, contentWidth / 2 - 5, 60, true);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  addText('CUSTOMER DETAILS', margin + 5, yPosition + 12);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  addText(`Name: ${booking.user?.name || 'N/A'}`, margin + 5, yPosition + 22);
  addText(`Email: ${booking.user?.email || 'N/A'}`, margin + 5, yPosition + 32);
  addText(`Phone: ${booking.phoneNumber}`, margin + 5, yPosition + 42);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  addText('SERVICE PROVIDER', margin + contentWidth / 2 + 10, yPosition + 12);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const proName = booking.pro ? `${booking.pro.firstName} ${booking.pro.lastName}` : 'N/A';
  addText(`Name: ${proName}`, margin + contentWidth / 2 + 10, yPosition + 22);
  addText(`Email: ${booking.pro?.email || 'N/A'}`, margin + contentWidth / 2 + 10, yPosition + 32);
  addText(`Phone: ${booking.pro?.phoneNumber || 'N/A'}`, margin + contentWidth / 2 + 10, yPosition + 42);
  
  yPosition += 80;
  
  pdf.setFillColor(lightGray);
  drawRect(margin, yPosition, contentWidth, 25, true);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  addText('SERVICE DETAILS', margin + 5, yPosition + 15);
  
  yPosition += 35;
  
  const labelX = margin + 5;
  const valueX = margin + 120;
  const maxValueWidth = pageWidth - valueX - margin;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  addText('Service Category:', labelX, yPosition);
  addText(`${booking.category?.name || 'N/A'}`, valueX, yPosition);
  yPosition += 12;
  
  addText('Issue Description:', labelX, yPosition);
  const issueLines = pdf.splitTextToSize(booking.issueDescription || 'N/A', maxValueWidth);
  pdf.setFontSize(9);
  addText(issueLines, valueX, yPosition);
  yPosition += (issueLines.length * 5) + 8;
  pdf.setFontSize(10);

  addText('Service Location:', labelX, yPosition);
  const locationText = booking.location?.address || 'N/A';
  const locLines = pdf.splitTextToSize(locationText, maxValueWidth);
  pdf.setFontSize(9);
  addText(locLines, valueX, yPosition);
  yPosition += (locLines.length * 5) + 8;
  pdf.setFontSize(10);
  
  const timeSlots = booking.preferredTime?.map(t => `${to12h(t.startTime)} - ${to12h(t.endTime)}`).join(', ') || 'N/A';
  addText('Time Slots:', labelX, yPosition);
  addText(timeSlots, valueX, yPosition);
  yPosition += 20;
  
  pdf.setFillColor(primaryColor);
  drawRect(margin, yPosition, contentWidth, 15, true);
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  addText('COST BREAKDOWN', margin + 5, yPosition + 10);
  
  yPosition += 25;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFillColor(lightGray);
  drawRect(margin, yPosition, contentWidth, 12, true);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  addText('Description', margin + 5, yPosition + 8);
  addText('Amount (₹)', pageWidth - margin - 40, yPosition + 8);
  
  yPosition += 20;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  
  drawLine(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
  addText('Labor Cost', margin + 5, yPosition + 5);
  addText(formatCurrency(quota.laborCost), pageWidth - margin - 40, yPosition + 5);
  yPosition += 15;
  
  if (quota.materialCost && quota.materialCost > 0) {
    drawLine(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
    addText('Material Cost', margin + 5, yPosition + 5);
    addText(formatCurrency(quota.materialCost), pageWidth - margin - 40, yPosition + 5);
    yPosition += 15;
  }
  
  if (quota.additionalCharges && quota.additionalCharges > 0) {
    drawLine(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
    addText('Additional Charges', margin + 5, yPosition + 5);
    addText(formatCurrency(quota.additionalCharges), pageWidth - margin - 40, yPosition + 5);
    yPosition += 15;
  }
  
  pdf.setFillColor(primaryColor);
  drawRect(margin, yPosition, contentWidth, 15, true);
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  addText('TOTAL AMOUNT', margin + 5, yPosition + 10);
  addText(`₹${formatCurrency(quota.totalCost)}`, pageWidth - margin - 50, yPosition + 10);
  
  yPosition += 25;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  addText('Payment Status:', margin, yPosition + 10);
  
  if (quota.paymentStatus === 'completed') {
    pdf.setTextColor(0, 128, 0); 
  } else if (quota.paymentStatus === 'failed') {
    pdf.setTextColor(255, 0, 0); 
  } else {
    pdf.setTextColor(255, 165, 0); 
  }
  
  pdf.setFont('helvetica', 'bold');
  addText(quota.paymentStatus?.toUpperCase() || 'PENDING', margin + 60, yPosition + 10);
  
  yPosition += 30;
  
  pdf.setTextColor(128, 128, 128);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  const footerY = pdf.internal.pageSize.height - 30;
  drawLine(margin, footerY - 10, pageWidth - margin, footerY - 10);
 
  const fileName = `Fixeify_Invoice_${(bookingNumber || 'BOOKING')}_${invoiceDate.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);
};


