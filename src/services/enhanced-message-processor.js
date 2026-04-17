const logger = require('../utils/logger');
const axios = require('axios');

// User sessions storage (in production, use Redis or database)
const userSessions = new Map();

// Product knowledge base
const products = {
  'เครื่องทำลายเอกสาร': {
    name: 'เครื่องทำลายเอกสาร',
    description: 'เครื่องทำลายเอกสารคุณภาพสูง สำหรับการรักษาความปลอดภัยข้อมูล',
    models: [
      { model: 'SD-20', capacity: '20 แผ่น', price: '12,000 บาท' },
      { model: 'SD-50', capacity: '50 แผ่น', price: '25,000 บาท' },
      { model: 'SD-100', capacity: '100 แผ่น', price: '45,000 บาท' }
    ]
  },
  'เครื่องสแกน': {
    name: 'เครื่องสแกนเอกสาร',
    description: 'เครื่องสแกนความละเอียดสูง เหมาะสำหรับงานสำนักงาน',
    models: [
      { model: 'SC-300', capacity: '30 หน้า/นาที', price: '18,000 บาท' },
      { model: 'SC-500', capacity: '50 หน้า/นาที', price: '35,000 บาท' }
    ]
  },
  'เครื่องถ่อยเอกสาร': {
    name: 'เครื่องถ่ายเอกสาร',
    description: 'เครื่องถ่ายเอกสารมัลติฟังก์ชัน พร้อมระบบดิจิทัล',
    models: [
      { model: 'CP-200', capacity: '20 หน้า/นาที', price: '30,000 บาท' },
      { model: 'CP-400', capacity: '40 หน้า/นาที', price: '55,000 บาท' }
    ]
  }
};

// FAQ data
const faqs = [
  {
    keywords: ['การรับประกัน', 'warranty', 'รับประกัน'],
    answer: 'สินค้าของเรารับประกัน 2 ปี พร้อมบริการซ่อมฟรีและเปลี่ยนชิ้นส่วน สอบถามเพิ่มเติมได้ที่ 02-123-4567'
  },
  {
    keywords: ['จัดส่ง', 'delivery', 'ส่งของ'],
    answer: 'เราจัดส่งทั่วประเทศไทย ใช้เวลา 3-5 วันทำการ ส่งฟรีสำหรับคำสั่งซื้อมากกว่า 20,000 บาท'
  },
  {
    keywords: ['ติดตั้ง', 'installation', 'setup'],
    answer: 'เรามีทีมช่างเข้าติดตั้งและอบรมการใช้งานฟรี พื้นที่กรุงเทพฯ และปริมณฑล ต่างจังหวัดคิดค่าเดินทางตามจริง'
  },
  {
    keywords: ['ราคา', 'price', 'เท่าไหร่'],
    answer: 'ราคาสินค้าขึ้นอยู่กับรุ่นและข้อกำหนด หากต้องการใบเสนอราคา กรุณาระบุรุ่นที่สนใจ เราจะจัดทำใบเสนอราคาให้ทันที'
  }
];

// Greeting patterns
const greetingPatterns = [
  /^(สวัสดี|hello|hi|ดีครับ|ดีค่ะ)/i,
  /^(เฮ้|hey|สวัสดีครับ|สวัสดีค่ะ)/i
];

const processMessage = async (message, userId) => {
  try {
    logger.log(`Processing message for user ${userId}: ${message}`);

    // Initialize user session if not exists
    if (!userSessions.has(userId)) {
      userSessions.set(userId, {
        conversationState: 'start',
        lastInteraction: Date.now(),
        pendingQuotation: null
      });
    }

    const userSession = userSessions.get(userId);
    userSession.lastInteraction = Date.now();

    const lowerMessage = message.toLowerCase();

    // Check for greetings
    if (greetingPatterns.some(pattern => pattern.test(message))) {
      return getWelcomeMessage();
    }

    // Check for help request
    if (lowerMessage.includes('help') || lowerMessage.includes('ช่วย') || lowerMessage.includes('คำสั่ง')) {
      return getHelpMessage();
    }

    // Check for contact information request
    if (lowerMessage.includes('ติดต่อ') || lowerMessage.includes('contact') || lowerMessage.includes('โทร')) {
      return getContactInfo();
    }

    // Check for quotation request
    if (lowerMessage.includes('ใบเสนอราคา') || lowerMessage.includes('quotation') || lowerMessage.includes('ราคา')) {
      return await handleQuotationRequest(message, userSession);
    }

    // Check for product inquiries
    const productResponse = findProductInfo(message);
    if (productResponse) {
      return productResponse;
    }

    // Check FAQ
    const faqResponse = findFAQResponse(message);
    if (faqResponse) {
      return faqResponse;
    }

    // Default response
    return `ขอบคุณสำหรับข้อความของคุณ\n\nหากต้องการความช่วยเหลือ พิมพ์ "help" หรือ "ช่วยเหลือ"\n\nหรือสอบถามเกี่ยวกับ:\n- เครื่องทำลายเอกสาร\n- เครื่องสแกน\n- เครื่องถ่ายเอกสาร\n- ใบเสนอราคา`;

  } catch (error) {
    logger.log('Message processing error:', error.message);
    return 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลข้อความ กรุณาลองใหม่อีกครั้ง';
  }
};

const getWelcomeMessage = () => {
  return `🏢 ยินดีต้อนรับสู่ GGRSM!

เราเป็นผู้จัดจำหน่ายอุปกรณ์สำนักงาน:
📄 เครื่องทำลายเอกสาร
🖨️ เครื่องถ่ายเอกสาร
📱 เครื่องสแกนเอกสาร

💬 คุณสามารถสอบถาม:
• รายละเอียดสินค้า
• ราคาและโปรโมชัน
• ใบเสนอราคา
• การรับประกัน

พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`;
};

const getHelpMessage = () => {
  return `📋 คำสั่งที่ใช้ได้:

🔍 สอบถามสินค้า:
• "เครื่องทำลายเอกสาร"
• "เครื่องสแกน"
• "เครื่องถ่ายเอกสาร"

💰 ขอใบเสนอราคา:
• "ขอใบเสนอราคา [ชื่อสินค้า]"
• "ราคาเครื่องทำลายเอกสาร"

📞 ติดต่อ:
• "ติดต่อ"
• "เบอร์โทร"

❓ คำถามทั่วไป:
• การรับประกัน
• การจัดส่ง
• การติดตั้ง`;
};

const getContactInfo = () => {
  return `📞 ติดต่อ GGRSM

🏢 ที่อยู่: กรุงเทพมหานคร
📱 โทร: 02-123-4567
📧 อีเมล: info@ggrsm.com
⏰ เวลาทำการ: จันทร์-ศุกร์ 8:00-17:00

🌐 เว็บไซต์: www.ggrsm.com
💬 LINE OA: @ggrsm`;
};

const findProductInfo = (message) => {
  const lowerMessage = message.toLowerCase();

  for (const [key, product] of Object.entries(products)) {
    const productKeywords = key.toLowerCase().split(' ');
    const hasMatch = productKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasMatch || lowerMessage.includes(key.toLowerCase())) {
      let response = `🔍 ${product.name}\n\n`;
      response += `📝 ${product.description}\n\n`;
      response += `📊 รุ่นที่มีจำหน่าย:\n`;

      product.models.forEach((model, index) => {
        response += `${index + 1}. ${model.model} - ${model.capacity} - ${model.price}\n`;
      });

      response += `\n💬 สนใจขอใบเสนอราคา พิมพ์ "ขอใบเสนอราคา ${product.name}"`;

      return response;
    }
  }

  return null;
};

const findFAQResponse = (message) => {
  const lowerMessage = message.toLowerCase();

  for (const faq of faqs) {
    const hasMatch = faq.keywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      return `❓ ${faq.answer}`;
    }
  }

  return null;
};

const handleQuotationRequest = async (message, userSession) => {
  try {
    logger.log('Processing quotation request');

    // Extract product from message
    let requestedProduct = null;
    for (const productName of Object.keys(products)) {
      if (message.toLowerCase().includes(productName.toLowerCase())) {
        requestedProduct = productName;
        break;
      }
    }

    if (!requestedProduct) {
      return `📋 กรุณาระบุสินค้าที่ต้องการใบเสนอราคา เช่น:\n\n• ขอใบเสนอราคาเครื่องทำลายเอกสาร\n• ขอใบเสนอราคาเครื่องสแกน\n• ขอใบเสนอราคาเครื่องถ่ายเอกสาร`;
    }

    // Generate quotation
    const quotation = await generateQuotation(requestedProduct);
    userSession.pendingQuotation = quotation;

    return quotation;

  } catch (error) {
    logger.log('Quotation processing error:', error.message);
    return 'ขออภัย เกิดข้อผิดพลาดในการจัดทำใบเสนอราคา กรุณาติดต่อทีมขายโดยตรงที่ 02-123-4567';
  }
};

const generateQuotation = async (productName) => {
  try {
    const product = products[productName];
    if (!product) {
      return 'ไม่พบสินค้าที่ระบุ';
    }

    // Mock CRM integration
    const quotationId = `QT${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('th-TH');

    let quotation = `📋 ใบเสนอราคา\n`;
    quotation += `🆔 เลขที่: ${quotationId}\n`;
    quotation += `📅 วันที่: ${currentDate}\n`;
    quotation += `🏢 บริษัท: GGRSM จำกัด\n\n`;

    quotation += `📦 สินค้า: ${product.name}\n`;
    quotation += `📝 รายละเอียด: ${product.description}\n\n`;

    quotation += `💰 รายการราคา:\n`;
    product.models.forEach((model, index) => {
      quotation += `${index + 1}. ${model.model} (${model.capacity}) - ${model.price}\n`;
    });

    quotation += `\n✅ รวมการติดตั้งและอบรม\n`;
    quotation += `✅ รับประกัน 2 ปี\n`;
    quotation += `✅ บริการหลังการขาย\n\n`;

    quotation += `📞 สอบถามเพิ่มเติม: 02-123-4567\n`;
    quotation += `💬 หรือพิมพ์ "ติดต่อ" เพื่อดูข้อมูลการติดต่อ`;

    // Log CRM integration (mock)
    logger.log(`Quotation generated: ${quotationId} for product: ${productName}`);

    return quotation;

  } catch (error) {
    logger.log('Quotation generation error:', error.message);
    throw error;
  }
};

module.exports = {
  processMessage,
  getWelcomeMessage,
  getHelpMessage,
  getContactInfo
};