import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/** กันหน้าขาวทั้งแอปเมื่อมี component ใดพังตอน render — แสดงข้อความและปุ่มโหลดใหม่แทน */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 text-center">
          <p className="text-lg font-semibold text-gray-800">เกิดข้อผิดพลาดบางอย่าง</p>
          <p className="text-sm text-gray-500 mt-2">ขออภัย หน้านี้แสดงผลไม่สำเร็จ กรุณาโหลดหน้าใหม่ ข้อมูลที่บันทึกไว้แล้วไม่หาย</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    )
  }
}
