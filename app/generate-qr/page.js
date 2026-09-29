'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GenerateQRPage() {
  // ฟอร์ม State
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState('')
  const [childCount, setChildCount] = useState('')

  // UI States
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // สถานะเมื่อโต๊ะเปิดค้างอยู่ (Active Session)
  const [activeSession, setActiveSession] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [closingTable, setClosingTable] = useState(false)

  // ผลลัพธ์ QR Code เมื่อเปิดโต๊ะสำเร็จ
  const [successData, setSuccessData] = useState(null)

  // ฟังก์ชันคำนวณเวลาเปิดมาแล้วกี่นาที
  const calculateMinutes = (createdAt) => {
    const createdTime = new Date(createdAt).getTime()
    const now = new Date().getTime()
    const diffMs = now - createdTime
    return Math.floor(diffMs / 60000)
  }

  // 1. กดปุ่ม "เปิดโต๊ะ"
  const handleOpenTable = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setActiveSession(null)

    if (!tableNumber || !adultCount) {
      setErrorMessage('กรุณากรอกเลขโต๊ะและจำนวนผู้ใหญ่')
      return
    }

    setLoading(true)

    try {
      const tNum = parseInt(tableNumber, 10)
      const adults = parseInt(adultCount, 10)
      const children = childCount ? parseInt(childCount, 10) : 0

      // เช็คว่ามี session ที่เปิดอยู่ (status = 'open') ของโต๊ะนี้แล้วหรือไม่
      const { data: existingSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, status, created_at')
        .eq('table_number', tNum)
        .eq('status', 'open')

      if (fetchError) throw fetchError

      if (existingSessions && existingSessions.length > 0) {
        // ถ้ามี session เปิดค้างอยู่ ให้เก็บข้อมูลแล้วแสดงกล่องเตือน
        setActiveSession(existingSessions[0])
        setLoading(false)
        return
      }

      // ถ้าไม่มี ให้สร้าง session ใหม่
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: tNum,
            adult_count: adults,
            child_count: children,
            status: 'open'
          }
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // สร้าง URL สำหรับสั่งอาหาร (ใช้ Origin ปัจจุบัน หรือ fallback เป็น window.location.origin)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const orderUrl = `${baseUrl}/order/${tNum}`

      setSuccessData({
        tableNumber: tNum,
        adultCount: adults,
        childCount: children,
        orderUrl: orderUrl
      })
    } catch (err) {
      console.error(err)
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  // 2. กดยืนยันปิดโต๊ะเดิม
  const handleConfirmCloseTable = async () => {
    if (!activeSession) return
    setClosingTable(true)
    setErrorMessage('')

    try {
      // อัปเดตเฉพาะแถวที่ยังมี status = 'open' เพื่อกันกดซ้ำซ้อน
      const { error, count } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', activeSession.id)
        .eq('status', 'open')

      if (error) throw error

      // ปิดกล่องยืนยันและกล่องเตือน กลับมาหน้าฟอร์มเดิม (ค่าในฟอร์มยังอยู่ครบ)
      setShowConfirmModal(false)
      setActiveSession(null)
    } catch (err) {
      console.error(err)
      setErrorMessage('ไม่สามารถปิดโต๊ะเดิมได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setClosingTable(false)
    }
  }

  // ฟังก์ชันคัดลอกลิงก์
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url)
    alert('คัดลอกลิงก์เรียบร้อยแล้ว!')
  }

  // ปุ่ม "เปิดโต๊ะใหม่" เพื่อล้างหน้าจอและฟอร์ม
  const handleResetForm = () => {
    setTableNumber('')
    setAdultCount('')
    setChildCount('')
    setSuccessData(null)
    setActiveSession(null)
  }

  return (
    <main style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>ระบบเปิดโต๊ะและสร้าง QR Code</h1>
      <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px' }}>GG Icecream - พนักงานหน้าร้าน</p>

      {errorMessage && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      {/* ถ้าเปิดโต๊ะสำเร็จแล้ว แสดง QR Code */}
      {successData ? (
        <div style={{ background: '#F9FAFB', border: '2px solid #E5E7EB', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
          <h2 style={{ color: '#059669', marginBottom: '15px' }}>เปิดโต๊ะสำเร็จ!</h2>
          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
            โต๊ะ {successData.tableNumber} · ผู้ใหญ่ {successData.adultCount} · เด็ก {successData.childCount}
          </p>

          <div style={{ background: '#fff', display: 'inline-block', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(successData.orderUrl)}`} 
              alt="Table QR Code"
              style={{ width: '250px', height: '250px', display: 'block' }}
            />
          </div>

          <div style={{ marginBottom: '25px', wordBreak: 'break-all', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
            <span style={{ fontSize: '14px', color: '#4B5563' }}>{successData.orderUrl}</span>
            <button 
              onClick={() => handleCopyLink(successData.orderUrl)}
              style={{ display: 'block', margin: '10px auto 0', padding: '6px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              คัดลอกลิงก์
            </button>
          </div>

          <button 
            onClick={handleResetForm}
            style={{ width: '100%', padding: '14px', background: '#0284C7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            เปิดโต๊ะใหม่
          </button>
        </div>
      ) : (
        /* ฟอร์มเปิดโต๊ะปกติ */
        <form onSubmit={handleOpenTable} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              เลขโต๊ะ (ตัวเลข) *
            </label>
            <input 
              type="number" 
              value={tableNumber} 
              onChange={(e) => setTableNumber(e.target.value)} 
              placeholder="เช่น 7" 
              required
              style={{ width: '100%', padding: '12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              จำนวนผู้ใหญ่ *
            </label>
            <input 
              type="number" 
              value={adultCount} 
              onChange={(e) => setAdultCount(e.target.value)} 
              placeholder="เช่น 2" 
              min="1"
              required
              style={{ width: '100%', padding: '12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              จำนวนเด็ก (ถ้ามี)
            </label>
            <input 
              type="number" 
              value={childCount} 
              onChange={(e) => setChildCount(e.target.value)} 
              placeholder="เช่น 1" 
              min="0"
              style={{ width: '100%', padding: '12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#9CA3AF' : '#10B981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เปิดโต๊ะ'}
          </button>
        </form>
      )}

      {/* 3. กล่องเตือนเมื่อโต๊ะมี Session เปิดค้างอยู่แล้ว */}
      {activeSession && !successData && (
        <div style={{ marginTop: '20px', background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#B91C1C', fontSize: '18px', marginTop: '0', marginBottom: '10px' }}>
            ⚠️ แจ้งเตือน: โต๊ะ {activeSession.table_number} มีลูกค้าอยู่
          </h3>
          <p style={{ fontSize: '16px', color: '#7F1D1D', marginBottom: '15px' }}>
            โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน
          </p>
          <button 
            onClick={() => setShowConfirmModal(true)}
            style={{ padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      {/* Confirm Dialog ยืนยันปิดโต๊ะเดิม */}
      {showConfirmModal && activeSession && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ marginTop: '0', color: '#1F2937', fontSize: '20px' }}>ยืนยันการปิดโต๊ะเดิม</h3>
            
            <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '8px', margin: '15px 0', fontSize: '15px', color: '#374151' }}>
              <p style={{ margin: '4px 0' }}><strong>เลขโต๊ะ:</strong> {activeSession.table_number}</p>
              <p style={{ margin: '4px 0' }}><strong>ผู้ใหญ่:</strong> {activeSession.adult_count} | <strong>เด็ก:</strong> {activeSession.child_count || 0}</p>
              <p style={{ margin: '4px 0', color: '#B91C1C', fontWeight: 'bold' }}>
                เปิดมาแล้ว {calculateMinutes(activeSession.created_at)} นาที
              </p>
            </div>

            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              เมื่อปิดโต๊ะแล้วสถานะออเดอร์เก่าจะถูกปิด คุณจะต้องกดปุ่ม "เปิดโต๊ะ" อีกครั้งเพื่อสร้าง Session ใหม่
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={closingTable}
                style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmCloseTable}
                disabled={closingTable}
                style={{ flex: 1, padding: '12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: closingTable ? 'not-allowed' : 'pointer' }}
              >
                {closingTable ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
