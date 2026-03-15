import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tango_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const signUp = (data) => api.post("/auth/signup", data).then((r) => r.data);
export const login = (data) => api.post("/auth/login", data).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const getUser = (id) => api.get(`/auth/user/${id}`).then((r) => r.data);
export const updateProfile = (data) => api.patch("/auth/profile", data).then((r) => r.data);

// Streams
export const getStreams = () => api.get("/streams").then((r) => r.data);
export const getStream = (id) => api.get(`/streams/${id}`).then((r) => r.data);
export const startStream = (data) => api.post("/streams", data).then((r) => r.data);
export const endStream = (id) => api.patch(`/streams/${id}/end`).then((r) => r.data);
export const joinStream = (id) => api.post(`/streams/${id}/join`).then((r) => r.data);
export const leaveStream = (id) => api.post(`/streams/${id}/leave`).then((r) => r.data);

// Gifts
export const getGifts = () => api.get("/gifts").then((r) => r.data);
export const sendGift = (data) => api.post("/gifts/send", data).then((r) => r.data);

// Wallet
export const getBalance = () => api.get("/wallet/balance").then((r) => r.data);
export const getTransactions = (page = 1) =>
  api.get(`/wallet/transactions?page=${page}`).then((r) => r.data);

// Follow
export const followUser = (userId) => api.post(`/follow/${userId}`).then((r) => r.data);
export const unfollowUser = (userId) => api.delete(`/follow/${userId}`).then((r) => r.data);
export const getFollowStatus = (userId) => api.get(`/follow/status/${userId}`).then((r) => r.data);
export const getFollowers = (userId) => api.get(`/follow/followers/${userId}`).then((r) => r.data);
export const getFollowing = (userId) => api.get(`/follow/following/${userId}`).then((r) => r.data);

// Leaderboard
export const getLeaderboard = () => api.get("/leaderboard").then((r) => r.data);

// Payment
const paymentApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost/payment" });
paymentApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tango_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getCoinPlans = () => paymentApi.get("/plans").then((r) => r.data);
export const createOrder = (planId) => paymentApi.post("/order", { planId }).then((r) => r.data);
export const verifyPayment = (data) => paymentApi.post("/verify", data).then((r) => r.data);

export default api;
