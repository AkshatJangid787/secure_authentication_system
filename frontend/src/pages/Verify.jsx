import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "../Loading";
import { server } from "../main";

const Verify = () => {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const params = useParams();

  const [loading, setLoading] = useState(true);

  async function verifyUser() {
    try {
      const { data } = await axios.post(`${server}/api/v1/verify/${params.token}`);

      setSuccessMessage(data.message);
    } catch (error) {
      setErrorMessage(error.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    verifyUser();
  }, [])

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <div className="w-50 m-auto mt-48">
          {successMessage && (<p className="text-green-500">{successMessage}</p>)}
          {errorMessage && (<p className="text-red-500">{errorMessage}</p>)}
        </div>
      )}
    </>
  );
};

export default Verify;
