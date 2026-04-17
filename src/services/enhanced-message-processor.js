const logger = require('../utils/logger');
const dialogflow = require('./dialogflow-service');

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
      { model: 'SD-100', capacity: '100 แผ่น', price: '45,000 บาท' },
    ],
  },
  'เครื่องสแกน': {
    name: 'เครื่องสแกนเอกสาร',
    description: 'เครื่องสแกนความละเอียดสูง เหมาะสำหรับงานสำนักงาน',
    models: [
      { model: 'SC-300', capacity: '30 หน้า/นาที', price: '18,000 บาท' },
      { model: 'SC-500', capacity: '50 หน้า/นาที', price: '35,000 บาท' },
    ],
  },
  'เครื่องถ่ายเอกสาร': {
    name: 'เครื่องถ่ายเอกสาร',
    description: 'เครื่องถ่ายเอกสารมัลติฟังก์ชัน พร้อมระบบดิจิทัล',
    models: [
      { model: 'CP-200', capacity: '20 หน้า/นาที', price: '30,000 บาท' },
      { model: 'CP-400', capacity: '40 หน้า/นาที', price: '55,000 บาท' },
    ],
  },
};

// Dialogflow entity value → product key in `products`
const productTypeMap = {
  shredder: 'เครื่องทำลายเอกสาร',
  scanner: 'เครื่องสแกน',
  copier: 'เครื่องถ่ายเอกสาร',
  เครื่องทำลายเอกสาร: 'เครื่องทำลายเอกสาร',
  เครื่องสแกน: 'เครื่องสแกน',
  เครื่องถ่ายเอกสาร: 'เครื่องถ่ายเอกสาร',
};

const processMessage = async (message, userId) => {
  try {
    if (!userSessions.has(userId)) {
      userSessions.set(userId, {
        conversationState: 'start',
        lastInteraction: Date.now(),
        pendingQuotation: null,
      });
    }
    const userSession = userSessions.get(userId);
    userSession.lastInteraction = Date.now();

    const df = await dialogflow.detectIntent(message, userId);
    return await dispatchIntent(df, message, userSession);
  } catch (error) {
    logger.log('Message processing error:', error.message);
    console.error(error);
    return 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลข้อความ กรุณาลองใหม่อีกครั้ง';
  }
};

// Intent name → handler. Map these to the intent displayNames you create in Dialogflow.
const dispatchIntent = async (df, message, session) => {
  const { intent, parameters, fulfillmentText, isFallback } = df;

  switch (intent) {
    case 'Default Welcome Intent':
    case 'greeting':
      return getWelcomeMessage();

    case 'help':
      return getHelpMessage();

    case 'contact':
      return getContactInfo();

    case 'product.inquiry':
      return handleProductInquiry(parameters, message) || fulfillmentText || getDefaultReply();

    case 'quotation.request':
      return handleQuotationRequest(parameters, message, session);

    default:
      // For FAQ intents (faq.warranty, faq.delivery, ...) let Dialogflow answer directly.
      if (fulfillmentText && !isFallback) return fulfillmentText;
      if (fulfillmentText && isFallback) return fulfillmentText;
      return getDefaultReply();
  }
};

const resolveProductKey = (parameters, message) => {
  const param = parameters?.product_type;
  if (typeof param === 'string' && productTypeMap[param]) return productTypeMap[param];
  // Fallback: scan message text for a product keyword
  const lower = (message || '').toLowerCase();
  for (const key of Object.keys(products)) {
    if (lower.includes(key.toLowerCase())) return key;
  }
  return null;
};

const handleProductInquiry = (parameters, message) => {
  const key = resolveProductKey(parameters, message);
  if (!key) return null;
  const product = products[key];

  let response = `🔍 ${product.name}\n\n`;
  response += `📝 ${product.description}\n\n`;
  response += `📊 รุ่นที่มีจำหน่าย:\n`;
  product.models.forEach((m, i) => {
    response += `${i + 1}. ${m.model} - ${m.capacity} - ${m.price}\n`;
  });
  response += `\n💬 สนใจขอใบเสนอราคา พิมพ์ "ขอใบเสนอราคา ${product.name}"`;
  return response;
};

const handleQuotationRequest = async (parameters, message, session) => {
  try {
    const key = resolveProductKey(parameters, message);
    if (!key) {
      return `📋 กรุณาระบุสินค้าที่ต้องการใบเสนอราคา เช่น:\n\n• ขอใบเสนอราคาเครื่องทำลายเอกสาร\n• ขอใบเสนอราคาเครื่องสแกน\n• ขอใบเสนอราคาเครื่องถ่ายเอกสาร`;
    }
    const quotation = await generateQuotation(key);
    session.pendingQuotation = quotation;
    return quotation;
  } catch (error) {
    logger.log('Quotation processing error:', error.message);
    return 'ขออภัย เกิดข้อผิดพลาดในการจัดทำใบเสนอราคา กรุณาติดต่อทีมขายโดยตรงที่ 02-123-4567';
  }
};

const generateQuotation = async (productName) => {
  const product = products[productName];
  if (!product) return 'ไม่พบสินค้าที่ระบุ';

  const quotationId = `QT${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleDateString('th-TH');

  let q = `📋 ใบเสนอราคา\n`;
  q += `🆔 เลขที่: ${quotationId}\n`;
  q += `📅 วันที่: ${currentDate}\n`;
  q += `🏢 บริษัท: GGRSM จำกัด\n\n`;
  q += `📦 สินค้า: ${product.name}\n`;
  q += `📝 รายละเอียด: ${product.description}\n\n`;
  q += `💰 รายการราคา:\n`;
  product.models.forEach((m, i) => {
    q += `${i + 1}. ${m.model} (${m.capacity}) - ${m.price}\n`;
  });
  q += `\n✅ รวมการติดตั้งและอบรม\n`;
  q += `✅ รับประกัน 2 ปี\n`;
  q += `✅ บริการหลังการขาย\n\n`;
  q += `📞 สอบถามเพิ่มเติม: 02-123-4567\n`;
  q += `💬 หรือพิมพ์ "ติดต่อ" เพื่อดูข้อมูลการติดต่อ`;

  logger.log(`Quotation generated: ${quotationId} for product: ${productName}`);
  return q;
};

const getWelcomeMessage = () => `🏢 ยินดีต้อนรับสู่ GGRSM!

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

const getHelpMessage = () => `📋 คำสั่งที่ใช้ได้:

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

const getContactInfo = () => `📞 ติดต่อ GGRSM

🏢 ที่อยู่: กรุงเทพมหานคร
📱 โทร: 096-207-2323
📧 อีเมล: ggrsm2025@gmail.com
⏰ เวลาทำการ: จันทร์-ศุกร์ 8:00-17:00

🌐 เว็บไซต์: www.ggrsm.com
💬 LINE OA: @ggrsm`;

const getDefaultReply = () =>
  `ขอบคุณสำหรับข้อความของคุณ\n\nหากต้องการความช่วยเหลือ พิมพ์ "help" หรือ "ช่วยเหลือ"\n\nหรือสอบถามเกี่ยวกับ:\n- เครื่องทำลายเอกสาร\n- เครื่องสแกน\n- เครื่องถ่ายเอกสาร\n- ใบเสนอราคา`;

module.exports = {
  processMessage,
  getWelcomeMessage,
  getHelpMessage,
  getContactInfo,
};
