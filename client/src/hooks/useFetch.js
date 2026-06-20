import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { clearAuthToken } from "../lib/authToken";

export function useFetch(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const response = await api.get(path);
      setData(response.data === undefined ? [] : response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthToken();
        toast.error("Сесията е изтекла. Влез отново.");
        return;
      }

      if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK" || !error.response) {
        toast.error("Сървърът не отговаря. Провери връзката към базата данни.");
        return;
      }

      toast.error(error.response?.data?.message || "Неуспешно зареждане на данните.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    api
      .get(path)
      .then((response) => {
        if (active) setData(response.data === undefined ? [] : response.data);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          clearAuthToken();
          toast.error("Сесията е изтекла. Влез отново.");
          return;
        }

        if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK" || !error.response) {
          toast.error("Сървърът не отговаря. Провери връзката към базата данни.");
          return;
        }

        toast.error(error.response?.data?.message || "Неуспешно зареждане на данните.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path]);

  return { data, loading, setData, refresh };
}
