# SonarQube (self-hosted)

วิเคราะห์คุณภาพโค้ด (bugs, code smells, security hotspots, test coverage) ของทั้ง backend (NestJS) และ
frontend (React) ในการสแกนเดียว รันเป็นเครื่องมือ dev บนเครื่องตัวเอง ไม่ใช่ส่วนหนึ่งของระบบที่ deploy จริง

ทุกคำสั่งด้านล่างรันจาก **root ของโปรเจกต์** (`D:\Download\itproject`) เสมอ ไม่ใช่จากในโฟลเดอร์ `sonarqube/` นี้
(เพราะ `sonar-project.properties` ที่ root อ้าง path แบบ relative ไปที่ `backend/src`,
`Catering Booking Web Application/src` ฯลฯ)

## 1. เปิด SonarQube server

```bash
docker compose -f sonarqube/docker-compose.yml up -d
```

รอสักครู่ (รอบแรกช้าหน่อยเพราะต้อง pull image + ตั้งฐานข้อมูลภายในครั้งแรก) แล้วเปิด
**http://localhost:9000** — login เริ่มต้น `admin` / `admin` (ระบบจะบังคับให้ตั้งรหัสผ่านใหม่ทันที)

> ถ้า container ออกเองไม่ยอม start ให้เช็ค log ด้วย `docker compose -f sonarqube/docker-compose.yml logs -f`
> ปัญหาที่เจอบ่อยที่สุดคือ Elasticsearch ต้องการ `vm.max_map_count >= 262144` — compose ไฟล์นี้ปิดเช็คนั้นไว้แล้ว
> (`SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true`) เหมาะกับการรันบนเครื่อง dev เดียว ถ้ายังไม่ผ่านจริงๆ (พบมากบน
> Linux/WSL2) ให้ตั้งค่าที่เครื่อง host แทน: `sudo sysctl -w vm.max_map_count=262144`

## 2. สร้าง token สำหรับสแกน

### แบบอัตโนมัติ (แนะนำ)

```bash
eval "$(./sonarqube/get-token.sh)"
```

สคริปต์จะรอให้ SonarQube พร้อม, เปลี่ยนรหัสผ่าน `admin` เริ่มต้นให้อัตโนมัติ (โชว์รหัสใหม่ออกมาให้เก็บไว้
ใช้ login หน้าเว็บครั้งต่อไป), สร้าง token แล้ว `export SONAR_TOKEN` ให้ในเทอร์มินัลปัจจุบันเลย (ใช้ `eval`
ครอบเพราะสคริปต์พิมพ์คำสั่ง `export SONAR_TOKEN=...` ออกมาทาง stdout — ข้อความอธิบายอื่นๆ ไปทาง stderr ไม่ปน)

รันซ้ำครั้งต่อไป (รหัสผ่าน admin ไม่ใช่ `admin` แล้ว) ต้องส่งรหัสผ่านที่ตั้งไว้เข้าไปด้วย:
```bash
eval "$(SONAR_ADMIN_PASSWORD='รหัสที่ตั้งไว้ตอนรันครั้งแรก' ./sonarqube/get-token.sh)"
```

### แบบมือ (ถ้าไม่อยากใช้สคริปต์)

ใน SonarQube UI: มุมขวาบน (ไอคอนบัญชี) → **My Account** → **Security** → ใส่ชื่อ token (เช่น `local-scan`) → **Generate**
เก็บ token ไว้ (โชว์ครั้งเดียว) — export ไว้ในเทอร์มินัลที่จะรันสแกน:

```bash
export SONAR_TOKEN=สลิปที่ก็อปมา
```

### อยากเก็บ token ไว้ถาวร ไม่ต้อง export มือทุกครั้ง

สร้างไฟล์ `.env.sonar` ที่ root โปรเจกต์ (ไม่ถูก commit เข้า git อยู่แล้ว เพราะ `.gitignore` มี `.env.*`
ครอบคลุมไว้) ใส่บรรทัดเดียว:
```
SONAR_TOKEN=ใส่ token ตรงนี้
```
แล้วก่อนรันสแกนทุกครั้ง โหลดค่าเข้า shell ก่อน:
```bash
set -a; source .env.sonar; set +a
```

## 3. Generate coverage report ก่อนสแกน (ไม่บังคับ แต่แนะนำ — ไม่งั้น SonarQube เห็นแค่ bugs/code smells ไม่เห็น % coverage)

```bash
cd backend && pnpm test:cov && cd ..
cd "Catering Booking Web Application" && pnpm test:cov && cd ..
```

## 4. รันสแกน

ใช้ Docker image ทางการของ sonar-scanner-cli แทนการติดตั้งลงเครื่องจริง (ต้อง join network เดียวกับ
container `sonarqube`):

```bash
docker run --rm \
  --network catering-sonarqube_default \
  -e SONAR_HOST_URL="http://sonarqube:9000" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

สแกนเสร็จแล้วดูผลที่ **http://localhost:9000/dashboard?id=catering-booking-platform**

## ไฟล์ที่เกี่ยวข้อง

- `sonarqube/docker-compose.yml` — ตัว SonarQube server เอง (ตั้ง `name: catering-sonarqube` ไว้ตรงๆ กัน
  docker compose เดาชื่อ network จากชื่อโฟลเดอร์เอง)
- `sonarqube/get-token.sh` — สร้าง token ผ่าน SonarQube REST API อัตโนมัติ แทนการกดผ่านหน้าเว็บเอง
- `sonar-project.properties` (อยู่ที่ **root** ของโปรเจกต์ ไม่ใช่ในนี้ — เป็นธรรมเนียมของ sonar-scanner
  ที่ไฟล์นี้ต้องอยู่ตำแหน่งเดียวกับโค้ดที่จะสแกน) — ตั้งค่าว่าจะสแกนอะไร (sources ทั้งสองฝั่ง, exclude
  node_modules/dist/migrations, ชี้ไปที่ lcov report ของแต่ละฝั่ง)
- `backend/jest.config.js` / `Catering Booking Web Application/vitest.config.ts` — ตั้ง coverage reporter เป็น
  `lcov` ให้ SonarQube อ่านได้ (สั่งด้วย `pnpm test:cov` ที่แต่ละโฟลเดอร์)

## หยุด/ลบ

```bash
docker compose -f sonarqube/docker-compose.yml down        # หยุด เก็บข้อมูลไว้ (volume)
docker compose -f sonarqube/docker-compose.yml down -v     # หยุด + ลบข้อมูลทั้งหมด (โปรเจกต์/ประวัติสแกนหาย)
```
