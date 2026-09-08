# 📱 LINE Bots for Concert Photo Booking (Python / FastAPI)

ระบบ LINE Bot ทั้งหมดที่แปลงจาก Next.js / TypeScript มาเป็นภาษา Python (FastAPI + SQLAlchemy) โดยแยกโฟลเดอร์ออกจากกันอย่างชัดเจนตามบทบาทหน้าที่ของบอทแต่ละตัว

---

## 📁 โครงสร้างโฟลเดอร์หลัก

```
LINEBOT/
├── customer_bot/                # 🤖 บอทบริการลูกค้า (Customer Bot)
│   ├── app/
│   │   ├── main.py              # FastAPI Application
│   │   ├── config.py            # การตั้งค่า Environment
│   │   ├── database.py          # SQLAlchemy Session
│   │   ├── models.py            # ORM Models (Schedules, Bookings, Cameras, Sessions)
│   │   ├── services/            # Business Logic & LINE API
│   │   └── routers/webhook.py   # POST /api/line-webhook
│   ├── Dockerfile               # Dockerfile สำหรับรัน Customer Bot (พอร์ต 8000)
│   ├── requirements.txt
│   ├── .env.example
│   ├── run.py                   # รันบอทลูกค้าเดี่ยวๆ (พอร์ต 8000)
│   └── README.md
│
├── admin_bot/                   # 👑 บอทเลขาแอดมิน - Ren (Admin Bot)
│   ├── app/
│   │   ├── main.py              # FastAPI Application
│   │   ├── config.py            # การตั้งค่า Environment
│   │   ├── database.py          # SQLAlchemy Session
│   │   ├── models.py            # ORM Models
│   │   ├── services/            # Business Logic & LINE API
│   │   └── routers/webhook.py   # GET & POST /api/line-admin-webhook
│   ├── Dockerfile               # Dockerfile สำหรับรัน Admin Bot (พอร์ต 8001)
│   ├── requirements.txt
│   ├── .env.example
│   ├── run.py                   # รันบอทแอดมินเดี่ยวๆ (พอร์ต 8001)
│   └── README.md
│
├── docker-compose.yml           # 🐳 จัดการรัน Customer Bot & Admin Bot ด้วย Docker Compose
├── Dockerfile                   # 🐳 All-in-One Dockerfile (รันทั้ง 2 บอทใน 1 Container)
├── .dockerignore                # ป้องกัน cache/secrets ติดเข้าไปใน Docker image
├── .env.example                 # รวม template ตัวแปร environment ทั้งหมด
├── run_all.py                   # สคริปต์สั่งรันทั้ง Customer Bot และ Admin Bot พร้อมกัน
└── README.md                    # เอกสารภาพรวมนี้
```

---

## 🚀 วิธีการติดตั้งและรัน

### วิธีที่ 1: รันด้วย Docker Compose (แนะนำ สะดวกที่สุด ⭐)

รันทั้ง `customer-bot` (พอร์ต 8000) และ `admin-bot` (พอร์ต 8001) แยก Container กันอย่างเป็นสัดส่วน พร้อมระบบ Restart อัตโนมัติและ Healthcheck

1. เตรียมไฟล์ `.env`:
```bash
cd LINEBOT
cp .env.example .env
```
*(กรอก Channel Access Token, Channel Secret และ DATABASE_URL ให้ครบถ้วน)*

2. สั่งรันด้วย Docker Compose:
```bash
docker compose up -d --build
```

3. คำสั่งที่ใช้บ่อย:
```bash
# ตรวจสอบสถานะ containers
docker compose ps

# ดู Logs แบบ Real-time
docker compose logs -f

# ดู Logs เฉพาะ Customer Bot
docker compose logs -f customer-bot

# ดู Logs เฉพาะ Admin Bot
docker compose logs -f admin-bot

# หยุดการทำงาน
docker compose down
```

---

### วิธีที่ 2: รันเป็น Single Container (All-in-One Container)

เหมาะสำหรับ Server หรือ Cloud Provider ที่กำหนดให้รันได้เพียง 1 Container:

```bash
cd LINEBOT
cp .env.example .env

# Build Image
docker build -t linebot-all .

# รัน Container (แมปพอร์ต 8000 และ 8001)
docker run -d \
  --name linebot-app \
  -p 8000:8000 \
  -p 8001:8001 \
  --env-file .env \
  --restart unless-stopped \
  linebot-all

# ดู Logs
docker logs -f linebot-app
```

---

### วิธีที่ 3: รันทั้ง 2 บอทพร้อมกันด้วย Python (`run_all.py`)

1. ติดตั้ง Dependencies:
```bash
cd LINEBOT
python3 -m venv venv
source venv/bin/activate
pip install -r customer_bot/requirements.txt
```

2. สร้างและตั้งค่าไฟล์ `.env` ในทั้งสองโฟลเดอร์:
```bash
cp customer_bot/.env.example customer_bot/.env
cp admin_bot/.env.example admin_bot/.env
```

3. รันทั้ง 2 ตัวพร้อมกัน:
```bash
python3 run_all.py
```

---

### วิธีที่ 4: รันแยกโฟลเดอร์อิสระ (Python หรือ Docker)

#### Customer Bot:
- **Docker**:
  ```bash
  docker build -t customer-bot ./customer_bot
  docker run -d -p 8000:8000 --env-file customer_bot/.env --name customer-bot customer-bot
  ```
- **Python**:
  ```bash
  cd LINEBOT/customer_bot
  python3 run.py
  ```

#### Admin Bot:
- **Docker**:
  ```bash
  docker build -t admin-bot ./admin_bot
  docker run -d -p 8001:8001 --env-file admin_bot/.env --name admin-bot admin-bot
  ```
- **Python**:
  ```bash
  cd LINEBOT/admin_bot
  python3 run.py
  ```

---

## 🔗 การตั้งค่า Webhook ใน LINE Developers Console

| บอท | LINE Developers Console Webhook URL | ฟังก์ชันหลัก |
|---|---|---|
| **Customer Bot** | `https://<your-domain>/api/line-webhook` | ต้อนรับลูกค้า, เช็กคิว, เลือกกล้อง, จองคิว Step-by-Step, แนบสลิปมัดจำ |
| **Admin Bot** | `https://<your-domain>/api/line-admin-webhook` | ตรวจสอบคิวรออนุมัติ, คอนเฟิร์มคิว/ยกเลิกคิว, แจ้งผลหาลูกค้าอัตโนมัติ, ตรวจสอบตาราง |

---

## 🗄️ ฐานข้อมูล (Database)
ทั้งสองบอทเชื่อมต่อไปยัง Supabase PostgreSQL เดียวกัน (`DATABASE_URL`) ผ่าน SQLAlchemy โดยมีตารางที่แชร์ร่วมกัน:
- `schedules` : ตารางงานและสถานะรอบเวลา
- `bookings` : รายการจองคิว (pending, confirmed, cancelled)
- `cameras` : ข้อมูลรุ่นกล้องและราคา
- `line_sessions` : สถานะการนำทางขั้นตอนของลูกค้า
- `admin_sessions` : สถานะการทำรายการยืนยันคิวของแอดมิน

