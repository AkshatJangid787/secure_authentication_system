import React from 'react'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import {ToastContainer} from "react-toastify"
import VerifyOtp from './pages/VerifyOtp'
import Loading from './Loading'
import { AppData } from './context/AppContext'

const App = () => {
  const {isAuth, loading} = AppData()
  return (
    <>
      {loading?<Loading/> : <BrowserRouter>
        <Routes>
          <Route path='/' element={isAuth ? <Home/> : <Login/>}/>
          <Route path='/login' element={isAuth ? <Home/> : <Login/>}/>
          <Route path='/register' element={<Register/>}/>
          <Route path='/verifyotp' element={isAuth ? <Home/> : <VerifyOtp/>}/>
        </Routes>
        <ToastContainer/>
      </BrowserRouter>
      }
    </>
  )
}

export default App