import React from 'react'
import { AppData } from '../context/AppContext'

const Home = () => {
  const {logoutUser} = AppData()

  return (
    <div className='flex justify-center mt-72'>
      <button className='bg-red-500 text-white p-2 rounded-md' onClick={logoutUser}>Logout</button>
    </div>
  )
}

export default Home