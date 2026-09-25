import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppState, Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './index.css'

const audience = import.meta.env.VITE_AUTH0_AUDIENCE

/** redirect_uri ตั้งเป็น origin เฉยๆ เสมอ (ไม่มี path) — Auth0 เลยพากลับมาที่ "/" ทุกครั้งหลัง login สำเร็จ
 *  ถ้าเปิดมาจากลิงก์เฉพาะร้าน (เช่น /pipat-catering) แล้วกด login กลางทาง path นั้นจะหายไป ทั้งที่ตัวข้อมูลร้าน
 *  ที่เลือกไว้ยังอยู่ใน localStorage ปกติ (ไม่กระทบการทำงาน) — คืน URL กลับมาด้วยเพื่อให้แชร์ tab ต่อได้ตรงร้านเดิม
 *  ผ่าน appState.returnTo ที่ Login.tsx ส่งเข้ามาตอนเรียก loginWithRedirect() */
const onRedirectCallback = (appState?: AppState) => {
  window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)
