'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const formatTime = (createdAt) => {
    const date = new Date(createdAt)
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
  }

  useEffect(() => {
    async function fetchInitialOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['received', 'cooking'])
          .order('created_at', { ascending: true })

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialOrders()

    const channel = supabase
      .channel('kitchen-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new
            if (['received', 'cooking'].includes(newOrder.status)) {
              setOrders((prev) => {
                if (prev.some((o) => o.id === newOrder.id)) return prev
                return [...prev, newOrder]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new
            setOrders((prev) => {
              if (!['received', 'cooking'].includes(updatedOrder.status)) {
                return prev.filter((o) => o.id !== updatedOrder.id)
              }
              return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      if (newStatus === 'served') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        )
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: '24px', background: '#111827', color: '#fff' }}>
        กำลังโหลดหน้าจอห้องครัว...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#111827', minHeight: '100vh', padding: '20px', color: '#fff' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #374151', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', margin: 0, color: '#F3F4F6' }}>👨‍🍳 หน้าจอห้องครัว (Kitchen Display)</h1>
        <div style={{ fontSize: '18px', background: '#1F2937', padding: '8px 16px', borderRadius: '8px', border: '1px solid #374151' }}>
          ออเดอร์ที่ต้องทำ: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{orders.length}</span> รายการ
        </div>
      </header>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF', fontSize: '24px' }}>
          🎉 เยี่ยม! ไม่มีออเดอร์ค้างในขณะนี้
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.map((order) => {
            const isCooking = order.status === 'cooking'
            return (
              <div 
                key={order.id} 
                style={{
                  background: isCooking ? '#78350F' : '#1F2937',
                  border: `3px solid ${isCooking ? '#F59E0B' : '#4B5563'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '15px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 'bold', background: '#EF4444', padding: '4px 14px', borderRadius: '8px', color: '#fff' }}>
                      โต๊ะ {order.table_number}
                    </span>
                    <span style={{ fontSize: '16px', color: '#D1D5DB', fontWeight: 'bold' }}>
                      {formatTime(order.created_at)}
                    </span>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      background: isCooking ? '#D97706' : '#374151', 
                      color: '#fff',
                      fontWeight: 'bold'
                    }}>
                      {isCooking ? '🔥 กำลังทำอาหาร' : '⏳ รอคิวทำ'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '18px', lineHeight: '1.6' }}>
                      {order.items && order.items.map((item, index) => (
                        <link key={index} /> || (
                          <li key={index} style={{ marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: '#F3F4F6' }}>{item.name}</span>
                            {' '}
                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '16px', color: '#FCD34D', fontWeight: 'bold' }}>
                              ×{item.quantity}
                            </span>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {!isCooking ? (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'cooking')}
                      style={{ flex: 1, padding: '14px', background: '#F59E0B', color: '#111827', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      เริ่มทำ
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, 'served')}
                      style={{ flex: 1, padding: '14px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      จัดเสิร์ฟแล้ว
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
