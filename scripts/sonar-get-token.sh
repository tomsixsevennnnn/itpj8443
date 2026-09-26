#!/usr/bin/env bash
# สร้าง SonarQube user token อัตโนมัติผ่าน REST API แทนการกดผ่านหน้าเว็บเอง (ดูขั้นตอน manual ใน SONARQUBE.md)
# ต้องรัน `docker compose -f docker-compose.sonarqube.yml up -d` ให้ SonarQube server ขึ้นก่อนเสมอ — สคริปต์นี้
# รอ health check ให้เองถ้ายังไม่พร้อม
#
# ใช้งาน:
#   ./scripts/sonar-get-token.sh [ชื่อ token]
#
# รันครั้งแรก (รหัสผ่าน admin ยังเป็นค่าเริ่มต้น admin/admin) — สคริปต์จะเปลี่ยนรหัสผ่านให้อัตโนมัติแล้วพิมพ์
# รหัสใหม่ออกมาให้เก็บไว้ (ต้องใช้ login หน้าเว็บครั้งต่อไปด้วย ไม่มีวิธีดูซ้ำ)
# รันครั้งต่อไป (รหัสผ่านไม่ใช่ค่าเริ่มต้นแล้ว) — ต้องส่งรหัสผ่านปัจจุบันผ่าน SONAR_ADMIN_PASSWORD:
#   SONAR_ADMIN_PASSWORD='รหัสที่ตั้งไว้' ./scripts/sonar-get-token.sh
set -euo pipefail

SONAR_URL="${SONAR_URL:-http://localhost:9000}"
TOKEN_NAME="${1:-local-scan-$(date +%s)}"
ADMIN_PASSWORD="${SONAR_ADMIN_PASSWORD:-admin}"

echo "รอ SonarQube server พร้อมใช้งานที่ $SONAR_URL ..." >&2
until curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; do
  sleep 3
done
echo "SonarQube พร้อมแล้ว" >&2

# ล็อกอินด้วย admin/admin (ค่าเริ่มต้น) เรียก API อื่นไม่ได้จนกว่าจะเปลี่ยนรหัสผ่านก่อน — เช็คว่ายังเป็นรหัส
# เริ่มต้นอยู่ไหม ถ้าใช่ให้สุ่มรหัสใหม่แล้วเปลี่ยนให้อัตโนมัติเลย
if [ "$ADMIN_PASSWORD" = "admin" ]; then
  NEW_PASSWORD="${SONAR_NEW_PASSWORD:-$(node -e "console.log(require('crypto').randomBytes(18).toString('base64'))")}"
  echo "รหัสผ่าน admin ยังเป็นค่าเริ่มต้น — เปลี่ยนเป็นรหัสใหม่อัตโนมัติ..." >&2
  if curl -sf -u admin:admin -X POST "$SONAR_URL/api/users/change_password" \
    --data-urlencode "login=admin" \
    --data-urlencode "previousPassword=admin" \
    --data-urlencode "password=$NEW_PASSWORD" >/dev/null 2>&1; then
    ADMIN_PASSWORD="$NEW_PASSWORD"
    echo "" >&2
    echo "เปลี่ยนรหัสผ่าน admin แล้ว เก็บไว้ใช้ login หน้าเว็บครั้งต่อไปด้วย (โชว์ครั้งนี้ครั้งเดียว):" >&2
    echo "  SONAR_ADMIN_PASSWORD=$NEW_PASSWORD" >&2
    echo "" >&2
  fi
fi

echo "สร้าง token ชื่อ \"$TOKEN_NAME\" ..." >&2
RESPONSE=$(curl -sf -u "admin:$ADMIN_PASSWORD" -X POST "$SONAR_URL/api/user_tokens/generate" \
  --data-urlencode "name=$TOKEN_NAME")

TOKEN=$(echo "$RESPONSE" | node -e "
  let data = ''
  process.stdin.on('data', d => data += d)
  process.stdin.on('end', () => {
    try {
      const parsed = JSON.parse(data)
      if (!parsed.token) throw new Error('no token in response')
      console.log(parsed.token)
    } catch {
      process.exit(1)
    }
  })
")

if [ -z "$TOKEN" ]; then
  echo "สร้าง token ไม่สำเร็จ — response จาก SonarQube: $RESPONSE" >&2
  exit 1
fi

echo "สร้าง token สำเร็จ" >&2
echo ""
echo "export SONAR_TOKEN=$TOKEN"
