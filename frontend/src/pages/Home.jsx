import React from 'react'
import { AppData } from '../context/AppContext'
import {Link, useNavigate} from 'react-router-dom'

const Home = () => {
  const {logoutUser, user} = AppData();
  const navigate = useNavigate();

  return (
    <div className='flex justify-center mt-72'>
      <button className='bg-red-500 text-white p-2 rounded-md' onChange={logoutUser} onClick={()=> logoutUser(navigate)}>Logout</button>
      {
        user && user.role==="admin" && (
          <Link to="/dashboard" className='bg-purple-500 text-white p-2 rounded-md' >Dashboard</Link>
        )
      }
    </div>
  )
}

export default Home