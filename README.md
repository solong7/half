# คนละครึ่งพลัส Planner (PWA)

แอปเว็บแบบ PWA สำหรับคำนวณและวางแผนการใช้สิทธิคนละครึ่งพลัสจนถึงวันที่ 31 ธันวาคม พ.ศ. 2568 พร้อมแสดงผลเป็นปฏิทินภาษาไทยอย่างสวยงาม ใช้งานได้ดีบนมือถือและสามารถติดตั้งเป็นแอปได้ (Installable, Offline-ready).

## ฟีเจอร์หลัก
- คำนวณจำนวน “วันใช้งาน” จากยอดสิทธิคงเหลือและยอดใช้ต่อวัน (จำกัดวันละไม่เกิน 200 บาท)
- แสดงปฏิทินภาษาไทย ตั้งแต่เดือนปัจจุบันไปจนถึงสิ้นปี 2568 พร้อมชิปจำนวนเงินในแต่ละวันที่ใช้
- เน้น “วันสุดท้ายของการใช้สิทธิ” ด้วยตัวหนังสือสีแดง
- สรุปผลแบบพิมพ์ทีละตัว (typewriter effect) เพื่อความรู้สึกเหมือนแชต
- รองรับฟอนต์ `Prompt` และพาเล็ตสี #f2f6ff, #e3ecff
- ทำงานแบบ PWA: มี manifest, maskable icons, และ service worker (แคชไฟล์สำหรับใช้งานออฟไลน์)

## วิธีรันแบบท้องถิ่น (Local)
เนื่องจาก Service Worker ต้องการรันผ่านเซิร์ฟเวอร์ แนะนำให้เปิดผ่านเซิร์ฟเวอร์สแตติก:

- PowerShell (Windows):
  - เปิดที่โฟลเดอร์โปรเจกต์ แล้วรันคำสั่งนี้เพื่อเสิร์ฟที่พอร์ต 8000
  - `powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://127.0.0.1:8000/'); $listener.Start(); Write-Output 'Preview: http://127.0.0.1:8000/'; while ($true) { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $path = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }; $full = Join-Path (Get-Location) $path; if (Test-Path $full) { $ext = [IO.Path]::GetExtension($full).ToLower(); $ctype = switch ($ext) { '.html' {'text/html'} '.css' {'text/css'} '.js' {'application/javascript'} '.json' {'application/json'} '.svg' {'image/svg+xml'} default {'application/octet-stream'} }; $bytes = [System.IO.File]::ReadAllBytes($full); $res.ContentType = $ctype; $res.StatusCode = 200; $res.OutputStream.Write($bytes,0,$bytes.Length) } else { $res.StatusCode = 404 }; $res.Close() }"`
  - เปิดเบราว์เซอร์ที่ `http://127.0.0.1:8000/`

- ทางเลือกอื่น: `python -m http.server 8000` หรือ `npx http-server -p 8000` (ถ้ามี Python/Node)

## วิธีใช้งาน
1. กรอก “สิทธิคนละครึ่งพลัสที่คงเหลือ (บาท)” ช่วง `0–2400`
2. กรอก “ตั้งใจใช้ต่อวัน (บาท)” สูงสุด `200`
3. กดปุ่ม “คำนวณแผน”
4. อ่านสรุปผลด้านบน (ข้อความพิมพ์ทีละตัว) และดูปฏิทินการใช้สิทธิ

## กติกาอินพุต
- รับเฉพาะตัวเลข (กรองอักขระอื่นทิ้ง)
- ไม่อนุญาตเลข 0 นำหน้า (ยกเว้นกรอก `0` เดี่ยว)
- จำกัดค่าขณะพิมพ์: เกิน `2400` จะถูกปรับเป็น `2400` และเกิน `200` จะปรับเป็น `200`
- สเต็ปแนะนำ: สิทธิคงเหลือ `step=100`, ต่อวัน `step=10`

## หลักการคำนวณ
- วันเริ่มต้น: “วันนี้” (วันที่ท้องถิ่น)
- วันสิ้นสุด: 31 ธันวาคม พ.ศ. 2568 (`endDate = 2025-12-31` ตามค.ศ.)
- คิดทีละวัน: `amount = min(perDay, remaining)` จนกว่า `remaining` จะหมดหรือถึง `endDate`
- ใช้คีย์วันที่แบบโลคัลเพื่อเลี่ยงปัญหา UTC: สร้างรูปแบบ `YYYY-MM-DD` จาก `getFullYear()/getMonth()/getDate()`
- เทียบเงื่อนไขด้วย “เฉพาะวัน” (ตัดเวลาในวัน) เพื่อให้แสดงผลตรงวันจริง

## โครงสร้างไฟล์
- `index.html` — โครงหน้าเว็บและฟอร์มอินพุต
- `styles.css` — สไตล์หลัก, สีพาเล็ต, เอฟเฟกต์เฟดอิน และเคอร์เซอร์กระพริบของ typewriter
- `app.js` — ลอจิกคำนวณ, เรนเดอร์ปฏิทิน, กรองอินพุต, และเอฟเฟกต์พิมพ์ทีละตัว
- `manifest.webmanifest` — เมตาของ PWA และรายการไอคอน
- `service-worker.js` — แคชไฟล์แบบ cache-first เพื่อรองรับออฟไลน์
- `icons/` — ไอคอน SVG/ICO สำหรับ PWA และ favicon

## การปรับแต่ง
- ความเร็วการพิมพ์สรุป: ปรับพารามิเตอร์ที่ `typeText($summary, summaryText, 16)` (เลขมาก = ช้าลง)
- สีและฟอนต์: แก้ใน `styles.css` (`:root`)
- แสดงเช็กบ็อกซ์รายวัน: ปัจจุบันถูกถอดออก หากต้องการกลับมาให้สร้าง `<input type="checkbox">` ในส่วนเรนเดอร์วันที่อีกครั้ง

## หมายเหตุ
- Service Worker จะทำงานเมื่อเปิดผ่านเซิร์ฟเวอร์เท่านั้น (ไม่ทำงานบน `file://`)
- หากแก้ไขไฟล์บ่อย ๆ แนะนำเปลี่ยน `CACHE_NAME` ใน `service-worker.js` เพื่อบังคับรีเฟรชแคช

ขอให้สนุกกับการวางแผนใช้สิทธิครับ!
