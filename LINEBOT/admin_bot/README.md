# 👑 Admin LINE Bot - Ren เลขาจองคิว (Python / FastAPI)

บอทเลขาแอดมินสำหรับจัดการคิวจองถ่ายภาพคอนเสิร์ต รองรับการตรวจสอบคิวที่รออนุมัติ, ตรวจสอบรอบเวลาว่าง/เต็มของคอนเสิร์ตและกล้อง, การอนุมัติหรือยกเลิกคิวพร้อมแจ้งเตือนไปยังลูกค้าอัตโนมัติ, และการลงคิวผ่านข้อความฟอร์ม

---

## 📁 โครงสร้างโฟลเดอร์

```
admin_bot/
├── app/
│   ├── main.py              # FastAPI entrypoint
│   ├── config.py            # การตั้งค่า Environment Variables
│   ├── database.py          # เชื่อมต่อ PostgreSQL / Supabase
│   ├── models.py            # SQLAlchemy ORM Models
│   ├── services/
│   │   ├── line_service.py  # LINE Messaging API, Quick Reply, Push Message
│   │   ├── booking_service.py # จัดการข้อมูลการจอง (confirm/cancel)
│   │   ├── schedule_service.py # ระบบตารางรอบเวลา
│   │   ├── camera_service.py # ข้อมูลกล้อง
│   │   ├── session_service.py # จัดการ Session แอดมิน (Interactive flow)
│   │   └── utils.py         # Signature verification, Phone, Thai date
│   └── routers/
│       └── webhook.py       # Endpoint POST & GET /api/line-admin-webhook
├── requirements.txt         # รายการ dependencies
├── .env.example             # ตัวอย่างการตั้งค่าตัวแปรสิ่งแวดล้อม
├── run.py                   # สคริปต์รันเซิร์ฟเวอร์ (พอร์ต 8001)
└── README.md
```

---

## ⚙️ การติดตั้งและเริ่มต้นใช้งาน

### 1. ติดตั้ง Dependencies
```bash
cd LINEBOT/admin_bot

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
LINE_ADMIN_CHANNEL_ACCESS_TOKEN="<Your Admin Channel Token>"
LINE_ADMIN_CHANNEL_SECRET="<Your Admin Channel Secret>"
LINE_CHANNEL_ACCESS_TOKEN="<Customer Bot Token สำหรับ push แจ้งเตือนลูกค้า>"
DATABASE_URL="postgresql://username:password@hostname:port/dbname?sslmode=require"
PORT=8001
```

### 3. เริ่มต้นรันเซิร์ฟเวอร์
```bash
python3 run.py
```
หรือรันผ่าน uvicorn โดยตรง:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 🩺 การตรวจสอบความพร้อม (Health Check)

สามารถเปิด Browser หรือยิง GET Request ไปที่:
```
http://localhost:8001/api/line-admin-webhook
```
เพื่อตรวจสอบสถานะการเชื่อมต่อ Database และความครบถ้วนของ Environment Variables ได้ทันที

---

## 🔗 การตั้งค่า LINE Developers Console

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Messaging API ของบอทแอดมิน
3. ตั้งค่า **Webhook URL**:
   `https://<your-domain-or-ngrok>/api/line-admin-webhook`
   (หรือใช้ alias `https://<your-domain-or-ngrok>/webhook`)
4. กด **Verify** ให้ขึ้น Success
5. เปิด **Use webhook** เป็น **ON**

