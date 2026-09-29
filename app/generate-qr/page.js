'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function OrderPage({ params }) {
  // Unwrap params ตามข้อกำหนด Next.js เวอร์ชันล่าสุด
  const resolvedParams = use(params)
  const tableNumber = resolvedParams.tableNumber

  // States สำหรับ Session และการตรวจสอบโต๊ะ
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [sessionError, setSessionError] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  // States สำหรับเมนูและหมวดหมู่
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)

  // States สำหรับตะกร้าสินค้า (Cart) และการส่งออเดอร์
  const [cart, setCart] = useState({}) // { [itemId]: quantity }
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccessMsg, setOrderSuccessMsg] = useState(false)

  // States สำหรับเรียกเก็บเงิน (Bill Modal)
  const [showBillModal, setShowBillModal] = useState(false)
  const [paying, setPaying] = useState(false)

  // 1. ตรวจสอบ Session ของโต๊ะเมื่อโหลดหน้าเว็บ
  useEffect(() => {
    async function fetchSessionAndMenu() {
      try {
        const tNum = parseInt(tableNumber, 10)

        // เช็ค session ที่เปิดอยู่ (status = 'open')
        const { data: sessionsData, error: sessionErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_number', tNum)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)

        if (sessionErr) throw sessionErr

        if (!sessionsData || sessionsData.length === 0) {
          setSessionError(true)
          setLoadingSession(false)
          return
        }

        setSession(sessionsData[0])

        // โหลดข้อมูลหมวดหมู่เมนู
        const { data: catData, error: catErr } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order', { ascending: true })

        if (catErr) throw catErr
        setCategories(catData || [])
        if (catData && catData.length > 0) {
          setActiveCategory(catData[0].id)
        }

        // โหลดข้อมูลรายการเมนูทั้งหมด
        const { data: itemData, error: itemErr } = await supabase
          .from('menu_items')
          .select('*')

        if (itemErr) throw itemErr
        setMenuItems(itemData || [])

      } catch (err) {
        console.error(err)
        setSessionError(true)
      } finally {
        setLoadingSession(false)
      }
    }

    fetchSessionAndMenu()
  }, [tableNumber])

  // ฟังก์ชันจัดการเพิ่ม/ลดจำนวนในตะกร้า (จำกัดไม่เกิน 5 ชิ้นต่อรายการ)
  const handleUpdateQuantity = (item, delta) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.quantity || 0
      const newQty = currentQty + delta

      if (newQty <= 0) {
        const copy = { ...prev }
        delete copy[item.id]
        return copy
      }

      if (newQty > 5) return prev // สูงสุด 5 ต่อรายการ

      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          quantity: newQty
        }
      }
    })
  }

  // คำนวณจำนวนชิ้นรวมในตะกร้า
  const totalCartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)

  // 2. ส่งออเดอร์
  const handleSubmitOrder = async () => {
    if (totalCartItemsCount === 0 || !session) return

    // เช็คข้อจำกัดสูงสุด 10 รายการต่อการส่ง 1 ครั้ง
    if (totalCartItemsCount > 10) {
      alert('สามารถสั่งได้สูงสุด 10 รายการต่อการส่ง 1 ครั้ง กรุณาลดจำนวนลง')
      return
    }

    setSubmitting(true)
    try {
      const itemsArray = Object.values(cart).map((i) => ({
        name: i.name,
        quantity: i.quantity
      }))

      const { error } = await supabase
        .from('orders')
        .insert([
          {
            session_id: session.id,
            table_number: parseInt(tableNumber, 10),
            items: itemsArray,
            status: 'received'
          }
        ])

      if (error) throw error

      // เคลียร์ตะกร้าและแจ้งเตือนสำเร็จ
      setCart({})
      setOrderSuccessMsg(true)
      setTimeout(() => setOrderSuccessMsg(false), 4000)

    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  // 3. คำนวณยอดเงินบุฟเฟต์ (ผู้ใหญ่ 289, เด็ก 145)
  const calculateTotalBill = () => {
    if (!session) return 0
    const adultTotal = (session.adult_count || 0) * 289
    const childTotal = (session.child_count || 0) * 145
    return adultTotal + childTotal
  }

  // ยืนยันเรียกเก็บเงิน (ปิด Session)
  const handleConfirmBill = async () => {
    if (!session) return
    setPaying(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id)

      if (error) throw error

      setIsClosed(true)
    } catch (err) {
      console.error(err)
      alert('ไม่สามารถทำรายการได้ กรุณาแจ้งพนักงานหน้าร้าน')
    } finally {
      setPaying(false)
      setShowBillModal(false)
    }
  }

  // --- Render States ต่างๆ ---

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: '18px' }}>
        กำลังโหลดข้อมูลโต๊ะ...
      </div>
    )
  }

  // ถ้าโต๊ะยังไม่เปิด หรือปิดบริการไปแล้ว
  if (sessionError || isClosed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', background: '#F9FAFB' }}>
        <h1 style={{ fontSize: '24px', color: isClosed ? '#059669' : '#DC2626', marginBottom: '10px' }}>
          {isClosed ? 'ขอบคุณที่ใช้บริการ' : 'โต๊ะนี้ยังไม่เปิดใช้งาน'}
        </h1>
        <p style={{ fontSize: '16px', color: '#4B5563' }}>
          {isClosed ? 'หวังว่าจะมีความสุขกับ GG Icecream ครับ 😊' : 'กรุณาติดต่อพนักงานหน้าร้านเพื่อเปิดโต๊ะ'}
        </p>
      </div>
    )
  }

  // กรองเมนูตามหมวดหมู่ที่เลือก
  const filteredMenuItems = menuItems.filter((item) => item.category_id === activeCategory)

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#F3F4F6', minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* Header & ปุ่มเรียกเก็บเงิน */}
      <header style={{ background: '#fff', padding: '15px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, color: '#1F2937' }}>GG Icecream</h1>
          <span style={{ fontSize: '14px', color: '#6B7280' }}>โต๊ะ {tableNumber} (ผู้ใหญ่: {session.adult_count}, เด็ก: {session.child_count || 0})</span>
        </div>
        <button 
          onClick={() => setShowBillModal(true)}
          style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
        >
          เรียกเก็บเงิน
        </button>
      </header>

      {/* แจ้งเตือนเมื่อส่งออเดอร์สำเร็จ */}
      {orderSuccessMsg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #A7F3D0' }}>
          ✨ ส่งออเดอร์เรียบร้อยแล้ว! สามารถเลือกสั่งรอบใหม่ต่อได้เลย
        </div>
      )}

      {/* หมวดหมู่เมนู (Tabs) */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', padding: '10px 15px', gap: '10px', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '20px',
              border: 'none',
              background: activeCategory === cat.id ? '#3B82F6' : '#E5E7EB',
              color: activeCategory === cat.id ? '#fff' : '#374151',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* รายการเมนูในหมวดหมู่ */}
      <main style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {filteredMenuItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6B7280', marginTop: '30px' }}>ไม่มีรายการเมนูในหมวดนี้</p>
          ) : (
            filteredMenuItems.map((item) => {
              const qty = cart[item.id]?.quantity || 0
              return (
                <div key={item.id} style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '17px', color: '#1F2937' }}>{item.name}</h3>
                  </div>
                  
                  {/* ปุ่มเพิ่ม/ลด จำนวนสำหรับแต่ละเมนู */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {qty > 0 && (
                      <>
                        <button 
                          onClick={() => handleUpdateQuantity(item, -1)}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #D1D5DB', background: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{qty}</span>
                      </>
                    )}
                    <button 
                      onClick={() => handleUpdateQuantity(item, 1)}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#10B981', color: '#fff', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* ตะกร้าลอยด้านล่างจอ (Floating Cart Bar) */}
      {totalCartItemsCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1F2937', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 6px rgba(0,0,0,0.1)', zIndex: 20 }}>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>เลือกแล้ว: {totalCartItemsCount} รายการ</span>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>(สูงสุด 10 รายการ/ครั้ง)</div>
          </div>
          <button 
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={{ background: '#10B981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
          </button>
        </div>
      )}

      {/* Modal ยืนยันเรียกเก็บเงิน */}
      {showBillModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: '0', fontSize: '20px', color: '#1F2937', textAlign: 'center' }}>ยืนยันเรียกเก็บเงิน</h3>
            
            <div style={{ background: '#F3F4F6', padding: '15px', borderRadius: '10px', margin: '15px 0', fontSize: '15px', color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>ผู้ใหญ่ ({session.adult_count} ท่าน × 289):</span>
                <span>{(session.adult_count || 0) * 289} ฿</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>เด็ก ({session.child_count || 0} ท่าน × 145):</span>
                <span>{(session.child_count || 0) * 145} ฿</span>
              </div>
              <hr style={{ border: '0', borderTop: '1px solid #D1D5DB', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#EF4444' }}>
                <span>ยอดรวมทั้งสิ้น:</span>
                <span>{calculateTotalBill()} ฿</span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', marginBottom: '20px' }}>
              เมื่อกดยืนยัน โต๊ะนี้จะถูกปิดและไม่สามารถสั่งอาหารต่อได้ กรุณาชำระเงินที่เคาน์เตอร์
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowBillModal(false)}
                disabled={paying}
                style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmBill}
                disabled={paying}
                style={{ flex: 1, padding: '12px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: paying ? 'not-allowed' : 'pointer' }}
              >
                {paying ? 'กำลังดำเนินการ...' : 'ยืนยันเรียกเก็บเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
