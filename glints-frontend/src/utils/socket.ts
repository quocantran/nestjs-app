import { cookies } from "next/headers";
import { io } from "socket.io-client";

import Cookies from "js-cookie";

const accessToken = Cookies.get("access_token");

const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
  withCredentials: true,
  query: { accessToken: accessToken ?? null },
});

export default socket;
