import { useAuth0 } from '@auth0/auth0-react'
import { ChefHat } from 'lucide-react'
import { AUTH0_CONNECTION } from '../auth'

export default function Login() {
  const { loginWithRedirect, isLoading } = useAuth0()

  const loginAsCustomer = () =>
    loginWithRedirect({ authorizationParams: { connection: AUTH0_CONNECTION.customer } })

  const loginAsOwner = () =>
    loginWithRedirect({ authorizationParams: { connection: AUTH0_CONNECTION.owner } })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-200 mb-4">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ร้านพิพัฒน์โภชนา</h1>
          <p className="text-gray-500 mt-1 text-sm">ระบบจองจัดเลี้ยงนอกสถานที่</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">ยินดีต้อนรับ</h2>
          <p className="text-sm text-gray-500 mb-8">เข้าสู่ระบบเพื่อเริ่มจองบริการจัดเลี้ยง</p>

          {/* Google Login */}
          <button
            onClick={loginAsCustomer}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-2xl py-3.5 px-6 transition-all font-medium text-gray-700 group disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="group-hover:text-orange-700">เข้าสู่ระบบด้วย Google</span>
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            โดยการเข้าสู่ระบบ คุณยอมรับ{' '}
            <span className="text-orange-500 cursor-pointer hover:underline">เงื่อนไขการใช้งาน</span>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
          </div>

          {/* Owner login — เข้าระบบแยกด้วย username/password ของร้าน ไม่ใช่ Google */}
          <button
            onClick={loginAsOwner}
            disabled={isLoading}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            เข้าระบบในฐานะเจ้าของร้าน
          </button>
        </div>
      </div>
    </div>
  )
}
