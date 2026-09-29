# GG Icecream

ระบบสั่งไอศกรีมออนไลน์ สร้างด้วย Next.js (App Router, JavaScript) และ Supabase สำหรับ Deploy บน Vercel

## ⚠️ ข้อควรระวังสำคัญสำหรับ Next.js App Router (Latest)
โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง **`params` ของ Dynamic Route เป็น Promise** เสมอ ต้องทำการ unwrap ด้วย `use()` จาก React ก่อนใช้งาน (ใช้สำหรับหน้าสั่งอาหารในขั้นตอนถัดไป) เช่น:
```javascript
import { use } from 'react';

export default function OrderPage({ params }) {
  const resolvedParams = use(params);
  const tableId = resolvedParams.id;
  // ...
}
```

## 🗄️ โครงสร้างฐานข้อมูล Supabase (Reference)
ระบบนี้อ้างอิงโครงสร้างตารางดังนี้:
- **sessions**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **menu_categories**: `id`, `name`, `sort_order`
- **menu_items**: `id`, `category_id`, `name`
- **orders**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`
