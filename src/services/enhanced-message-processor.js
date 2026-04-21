const logger = require('../utils/logger');
const dialogflow = require('./dialogflow-service');

// User sessions storage (in production, use Redis or database)
const userSessions = new Map();

// Session active timeout (30 minutes) — fallback/welcome จะเงียบภายในช่วงนี้
const SESSION_ACTIVE_MS = 30 * 60 * 1000;

// Confidence threshold — intent ต่ำกว่านี้ถือว่าไม่แน่นอน ให้เงียบเมื่อ session active
const LOW_CONFIDENCE_THRESHOLD = 0.6;

// Intents ที่ควร suppress หากเกิดซ้ำระหว่าง session ยัง active
const SUPPRESS_WHEN_ACTIVE_INTENTS = new Set([
    'Default Welcome Intent',
    'welcome',
    'Welcome',
  ]);

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
                            lastBotReplyTime: 0,
                            pendingQuotation: null,
                  });
          }

      const userSession = userSessions.get(userId);
          userSession.lastInteraction = Date.now();

      const df = await dialogflow.detectIntent(message, userId);
          const reply = await dispatchIntent(df, message, userSession);

      // บันทึกเวลาที่บอทตอบจริง (ไม่รวมกรณีเงียบ)
      if (reply) {
              userSession.lastBotReplyTime = Date.now();
      }

      return reply;
    } catch (error) {
          logger.log('Message processing error:', error.message);
          console.error(error);
          return 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลข้อความ กรุณาลองใหม่อีกครั้ง';
    }
};

// Only override Dialogflow responses for intents that need computed logic (product info, quotation).
// All other intents (welcome, help, contact, FAQ, etc.) use fulfillmentText from Dialogflow directly.
const dispatchIntent = async (df, message, session) => {
    const { intent, parameters, fulfillmentText, isFallback, confidence } = df;

    const elapsed = Date.now() - (session.lastBotReplyTime || 0);
    const sessionActive = session.lastBotReplyTime && elapsed < SESSION_ACTIVE_MS;

    // Session-aware suppression:
    // ถ้า session ยัง active (บอทเพิ่งตอบภายใน 30 นาที) แล้วเจอกรณีเหล่านี้ ให้เงียบ
    //   1) Fallback intent
    //   2) Welcome intent ซ้ำ (ทักทายกลับทั้งที่คุยกันอยู่)
    //   3) Intent ที่ confidence ต่ำกว่า threshold (Dialogflow เดามั่ว)
    if (sessionActive) {
          const isWelcomeRepeat = SUPPRESS_WHEN_ACTIVE_INTENTS.has(intent);
          const lowConfidence =
                  typeof confidence === 'number' && confidence < LOW_CONFIDENCE_THRESHOLD;

      if (isFallback || isWelcomeRepeat || lowConfidence) {
              logger.log(
                        `Suppressed (session active) intent=${intent} conf=${
                                    typeof confidence === 'number' ? confidence.toFixed(2) : 'n/a'
                        } fallback=${isFallback}`,
                      );
              return null; // เงียบ ไม่ส่ง reply
      }
    }

    // Session หมดอายุหรือ intent มั่นใจพอ → ใช้ fulfillmentText จาก Dialogflow
    if (isFallback) {
          return fulfillmentText || getDefaultReply();
    }

    switch (intent) {
      case 'product.inquiry':
              return handleProductInquiry(parameters, message) || fulfillmentText || getDefaultReply();
      case 'quotation.request':
              return handleQuotationRequest(parameters, message, session);
      default:
              // Use Dialogflow response for everything else (welcome, help, contact, FAQ, etc.)
        if (fulfillmentText) return fulfillmentText;
              return getDefaultReply();
    }
};

const resolveProductKey = (parameters, message) => {
    const param = parameters?.product_type;
    if (typeof param === 'string' && productTypeMap[param]) return productTypeMap[param];
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

// Used by webhook-controller.js when a user first follows the bot (follow event).
const getWelcomeMessage = () => `ขอบคุณสำหรับข้อความของคุณ ทางเราจำหน่าย:
- เครื่องทำลายเอกสาร
- เครื่องพิมพ์บัตรพนักงาน
- เครื่องพิมพ์เช็ค
- เครื่องเคลือบบัตร
- เครื่องนับเงิน
- เครื่องมือช่าง
สนใจสินค้ารายการไหน หรือมีสเปคที่ต้องการสอบถามได้ครับ`;

const getDefaultReply = () =>
    `ขออภัย ระบบขัดข้องชั่วคราว กรุณาติดต่อทีมงานโดยตรงที่ 02-123-4567 ครับ`;

module.exports = {
    processMessage,
    getWelcomeMessage,
};
