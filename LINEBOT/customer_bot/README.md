# 🤖 Customer LINE Bot (Python / FastAPI)

บอทบริการลูกค้าสำหรับระบบจองคิวถ่ายภาพคอนเสิร์ต รองรับการทำงานแบบ Interactive Step-by-Step, การส่ง Flex Carousel แสดงรายการคอนเสิร์ตและรุ่นกล้อง, การเช็ครอบเวลาว่าง/เต็ม, และการรับสลิปโอนเงินเพื่อส่งเรื่องต่อให้แอดมิน

---

## 📁 โครงสร้างโฟลเดอร์

```
customer_bot/
├── app/
│   ├── main.py              # FastAPI entrypoint
│   ├── config.py            # การตั้งค่า Environment Variables
│   ├── database.py          # เชื่อมต่อ PostgreSQL / Supabase
│   ├── models.py            # SQLAlchemy ORM Models
│   ├── services/
│   │   ├── line_service.py  # LINE Messaging API & Flex Builders
│   │   ├── booking_service.py # ระบบจัดการการจอง
│   │   ├── schedule_service.py # ระบบตารางรอบเวลา
│   │   ├── camera_service.py # ข้อมูลกล้อง
│   │   ├── session_service.py # จัดการ Session ลูกค้า
│   │   └── utils.py         # Signature verification, Phone, Thai date
│   └── routers/
│       └── webhook.py       # Endpoint POST /api/line-webhook
├── requirements.txt         # รายการ dependencies
├── .env.example             # ตัวอย่างการตั้งค่าตัวแปรสิ่งแวดล้อม
├── run.py                   # สคริปต์รันเซิร์ฟเวอร์ (พอร์ต 8000)
└── README.md
```

---

## ⚙️ การติดตั้งและเริ่มต้นใช้งาน

### 1. ติดตั้ง Dependencies
```bash
cd LINEBOT/customer_bot

# สร้าง Virtual Environment (แนะนำ)
python3 -m venv venv
source venv/bin/activate

# ติดตั้งแพ็กเกจ
pip install -r requirements.txt
```

### 2. ตั้งค่าไฟล์ `.env`
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
กำหนดค่าต่างๆ ในไฟล์ `.env`:
```env
LINE_CHANNEL_ACCESS_TOKEN="<Your Channel Access Token>"
LINE_CHANNEL_SECRET="<Your Channel Secret>"
LINE_ADMIN_CHANNEL_ACCESS_TOKEN="<Your Admin Channel Token สำหรับ push แจ้งแอดมิน>"
DATABASE_URL="postgresql://username:password@hostname:port/dbname?sslmode=require"
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
PORT=8000
```

### 3. เริ่มต้นรันเซิร์ฟเวอร์
```bash
python3 run.py
```
หรือรันผ่าน uvicorn โดยตรง:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔗 การตั้งค่า LINE Developers Console

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Messaging API ของบอทลูกค้า
3. ตั้งค่า **Webhook URL**:
   `https://<your-domain-or-ngrok>/api/line-webhook`
   (หรือใช้ alias `https://<your-domain-or-ngrok>/webhook`)
4. กด **Verify** ให้ขึ้น Success
5. เปิด **Use webhook** เป็น **ON**

