// WhatsApp integration utilities

// Format phone number for WhatsApp
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +91, keep it
  if (cleaned.startsWith('+91')) {
    return cleaned.substring(1); // Remove + for WhatsApp
  }
  
  // If it starts with 91, keep it
  if (cleaned.startsWith('91')) {
    return cleaned;
  }
  
  // If it's a 10-digit number, add 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // If it's already 12 digits (91 + 10 digits), return as is
  if (cleaned.length === 12) {
    return cleaned;
  }
  
  return cleaned;
};

// Format booking message for WhatsApp
export const formatBookingMessage = (booking, room) => {
  const bookingTypeLabels = {
    'inquiry': '📝 Inquiry',
    'booking': '🏠 Booking Request',
    'viewing': '👀 Viewing Request'
  };
  
  const message = `🏠 *New Room Booking Request*

📋 *Room Details:*
• Room: ${room.title}
• Rent: ₹${room.rent.toLocaleString()}/month
• Location: ${room.location}
• Contact: ${room.contact}

👤 *User Information:*
• Name: ${booking.userName}
• Phone: ${booking.userPhone}
• Email: ${booking.userEmail}

📅 *Booking Details:*
• Type: ${bookingTypeLabels[booking.type] || booking.type}
${booking.requestedDate ? `• Preferred Date: ${booking.requestedDate}` : ''}

💬 *Message:*
${booking.message}

📊 *Booking ID:* #${booking.id}
🕒 *Submitted:* ${new Date(booking.createdAt).toLocaleString()}

---
*This booking was submitted through Nivasi.space*`;

  return message;
};

// Generate WhatsApp URL
export const generateWhatsAppUrl = (phone, message) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

// Open WhatsApp with booking message
export const openWhatsAppWithBooking = (booking, room) => {
  const message = formatBookingMessage(booking, room);
  const whatsappUrl = generateWhatsAppUrl(room.contact, message);
  
  // Open in new tab/window
  window.open(whatsappUrl, '_blank');
};

// Copy message to clipboard
export const copyBookingMessage = async (booking, room) => {
  const message = formatBookingMessage(booking, room);
  
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch (error) {
    console.error('Failed to copy message:', error);
    return false;
  }
}; 