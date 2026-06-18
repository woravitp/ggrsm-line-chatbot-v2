# GGRSM LINE Official Account Chatbot

เชทบอท LINE OA สำหรับ @ggrsm ตอบคำถามลูกค้าเกี่ยวกับสินค้า และเชื่อมต่อกับระบบ CRM เพื่อออกใบเสนอราคา

## ฟีเจอร์หลัก
 
- 🤖 ตอบคำถามอัตโนมัติเกี่ยวกับสินค้า
- 📋 สร้างใบเสนอราคาผ่านระบบ
- 💬 รองรับภาษาไทย
- 🔗 เชื่อมต่อ GetMyCRM (เตรียมพร้อม)
- 📱 รองรับ LINE Messaging API

## สินค้าที่รองรับ

1. **เครื่องทำลายเอกสาร**
   - รุ่น SD-20 (20 แผ่น)
   - รุ่น SD-50 (50 แผ่น)
   - รุ่น SD-100 (100 แผ่น)

2. **เครื่องสแกนเอกสาร**
   - รุ่น SC-300 (30 หน้า/นาที)
   - รุ่น SC-500 (50 หน้า/นาที)

3. **เครื่องถ่ายเอกสาร**
   - รุ่น CP-200 (20 หน้า/นาที)
   - รุ่น CP-400 (40 หน้า/นาที)

## การติดตั้ง

### 1. Clone และติดตั้ง dependencies

```bash
# ติดตั้ง dependencies
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จากตัวอย่าง:

```bash
cp .env.example .env
```

แก้ไขค่าใน `.env`:
```env
LINE_CHANNEL_ID=2009820284
LINE_CHANNEL_SECRET=9744c06f7afaff62d0a1ec20b05eda78
LINE_CHANNEL_ACCESS_TOKEN=HW9uG/xqCT2K1c/MiPDEgMn9I97IBpLwH8u9gPO+y707sAaDSoWGBUGER1rq43vhx1Odj1KErP9/Xb8/bMCGTpXrFBwVQjsKHHHgSa2IJuplkaoHIM4N4gh78W3Hnk8QxMAI9ID6hS+JVn9Vv0AdCQdB04t89/1O/w1cDnyilFU=
```

### 3. รันเซิร์ฟเวอร์

```bash
# Development
npm run dev

# Production
npm start
```

## การ Deploy บน Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy บน Vercel

1. เข้า [vercel.com](https://vercel.com)
2. Connect GitHub repository
3. Deploy จะทำการ deploy อัตโนมัติ

### 3. ตั้งค่า Environment Variables บน Vercel

ไปที่ Project Settings > Environment Variables และเพิ่ม:
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`

### 4. ตั้งค่า Webhook URL

ไปที่ LINE Developers Console และตั้งค่า Webhook URL:
```
https://your-vercel-app.vercel.app/webhook
```

## การใช้งาน

### คำสั่งที่ลูกค้าสามารถใช้ได้:

1. **การทักทาย**
   - "สวัสดี", "hello", "hi"

2. **ขอความช่วยเหลือ**
   - "help", "ช่วยเหลือ", "คำสั่ง"

3. **สอบถามสินค้า**
   - "เครื่องทำลายเอกสาร"
   - "เครื่องสแกน"
   - "เครื่องถ่ายเอกสาร"

4. **ขอใบเสนอราคา**
   - "ขอใบเสนอราคาเครื่องทำลายเอกสาร"
   - "ราคาเครื่องสแกน"

5. **ข้อมูลการติดต่อ**
   - "ติดต่อ", "เบอร์โทร"

6. **FAQ**
   - "การรับประกัน"
   - "จัดส่ง"
   - "ติดตั้ง"

## โครงสร้างโปรเจกต์

```
line-chatbot/
├── src/
│   ├── controllers/
│   │   └── webhook-controller.js      # จัดการ webhook จาก LINE
│   ├── services/
│   │   └── enhanced-message-processor.js  # ประมวลผลข้อความ
│   ├── utils/
│   │   └── logger.js                 # ระบบ logging
│   └── server.js                     # Express server หลัก
├── config/
│   └── line-config.js               # การตั้งค่า LINE API
├── package.json
├── vercel.json                      # การตั้งค่า Vercel
├── .env.example                     # ตัวอย่าง environment variables
├── .gitignore
└── README.md
```

## การพัฒนาต่อ

### เชื่อมต่อ GetMyCRM

1. เพิ่ม API endpoints สำหรับ CRM integration
2. ตั้งค่า authentication กับ GetMyCRM
3. แก้ไข `enhanced-message-processor.js` เพื่อเรียก API จริง

### เพิ่มสินค้าใหม่

แก้ไขไฟล์ `src/services/enhanced-message-processor.js` ส่วน `products` object:

```javascript
const products = {
  'ชื่อสินค้าใหม่': {
    name: 'ชื่อสินค้าใหม่',
    description: 'คำอธิบายสินค้า',
    models: [
      { model: 'รุ่น', capacity: 'ความสามารถ', price: 'ราคา' }
    ]
  }
};
```

## การติดต่อ

- **เว็บไซต์**: www.ggrsm.com
- **โทร**: 065-509-9947
- **LINE OA**: @ggrsm
- **อีเมล**: info@ggrsm.com

## License

ISC License
