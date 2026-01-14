import React from 'react'
import { AppData } from '../context/AppContext'
import {useNavigate} from 'react-router-dom'

const Home = () => {
  const {logoutUser} = AppData();
  const navigate = useNavigate();

  return (
    <div className='flex justify-center mt-72'>
      <button className='bg-red-500 text-white p-2 rounded-md' onClick={logoutUser} onClick={()=> logoutUser(navigate)}>Logout</button>
    </div>
  )
}

export default Home