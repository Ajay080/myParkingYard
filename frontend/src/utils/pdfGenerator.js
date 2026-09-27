import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export const generateBookingPDF = async (booking, userProfile) => {
  try {
    const pdf = new jsPDF();
    
    // Set up colors and fonts
    const primaryColor = [37, 99, 235]; // Blue
    const secondaryColor = [107, 114, 128]; // Gray
    const textColor = [31, 41, 55]; // Dark gray
    
    // Header
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('My Parking Yard', 20, 20);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Parking Booking Receipt', 150, 20);
    
    // Reset text color
    pdf.setTextColor(...textColor);
    
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Booking Confirmation', 20, 50);
    
    // Booking details section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const details = [
      ['Booking ID:', booking._id || 'N/A'],
      ['Customer Name:', userProfile?.name || 'N/A'],
      ['Email:', userProfile?.email || 'N/A'],
      ['Phone:', userProfile?.phone || 'N/A'],
      ['Vehicle Number:', booking.numberPlate || 'N/A'],
      ['Zone:', booking.zoneId?.name || 'N/A'],
      ['Spot:', booking.spotId?.name || 'N/A'],
      ['Start Time:', new Date(booking.startTime).toLocaleString('en-US', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })],
      ['End Time:', new Date(booking.endTime).toLocaleString('en-US', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })],
      ['Duration:', calculateDuration(booking.startTime, booking.endTime)],
      ['Cost:', `₹${booking.amount || booking.cost || 0}`],
      ['Status:', booking.status || 'N/A'],
      ['Booking Date:', new Date(booking.createdAt || Date.now()).toLocaleString('en-US', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })]
    ];
    
    let yPosition = 70;
    details.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 80, yPosition);
      yPosition += 10;
    });
    
    // Add QR Code
    try {
      const qrData = JSON.stringify({
        bookingId: booking._id,
        numberPlate: booking.numberPlate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        zone: booking.zoneId?.name,
        spot: booking.spotId?.name
      });
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      pdf.addImage(qrCodeDataURL, 'PNG', 130, 80, 60, 60);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Scan QR Code for verification', 130, 150);
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
    }
    
    // Terms and conditions
    yPosition = 180;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms and Conditions:', 20, yPosition);
    
    const terms = [
      '• Please arrive on time for your booking',
      '• Keep this receipt for verification',
      '• No refunds for early departure',
      '• Contact support for any issues',
      '• Vehicle must display valid registration'
    ];
    
    pdf.setFont('helvetica', 'normal');
    terms.forEach(term => {
      yPosition += 8;
      pdf.text(term, 25, yPosition);
    });
    
    // Footer
    yPosition = 250;
    pdf.setFillColor(...secondaryColor);
    pdf.rect(0, yPosition, 210, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for choosing My Parking Yard!', 20, yPosition + 15);
    pdf.text('Contact: support@myparkingyard.com | Phone: +1 (555) 123-4567', 20, yPosition + 25);
    
    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `parking-receipt-${booking._id || timestamp}.pdf`;
    
    // Save the PDF
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export default { generateBookingPDF };
