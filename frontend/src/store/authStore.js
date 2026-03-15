import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tango_token", token);
      localStorage.setItem("tango_user", JSON.stringify(user));
    }
    set({ user, token });
  },

  initAuth: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("tango_token");
    const userStr = localStorage.getItem("tango_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token });
      } catch {}
    }
  },

  updateUser: (updates) =>
    set((state) => {
      const user = { ...state.user, ...updates };
      if (typeof window !== "undefined") {
        localStorage.setItem("tango_user", JSON.stringify(user));
      }
      return { user };
    }),

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tango_token");
      localStorage.removeItem("tango_user");
    }
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
