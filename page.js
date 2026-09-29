import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>GG Icecream</h1>
      <p>ระบบสั่งไอศกรีมและจัดการร้านค้า</p>
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <Link 
          href="/generate-qr" 
          style={{ padding: '12px 24px', background: '#0070f3', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          สร้าง QR Code สำหรับโต๊ะ
        </Link>
        <Link 
          href="/kitchen" 
          style={{ padding: '12px 24px', background: '#10B981', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          หน้าจอห้องครัว (Kitchen)
        </Link>
      </div>
    </main>
  )
}
