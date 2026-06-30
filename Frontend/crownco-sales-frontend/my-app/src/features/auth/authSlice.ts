import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, LoginResponse } from "../../lib/apiClient";

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
};

const isBrowser = typeof window !== "undefined";

function loadInitialState(): AuthState {
  if (!isBrowser) {
    return {
      user: null,
      token: null,
      permissions: [],
    };
  }

  try {
    const raw = localStorage.getItem("authState");
    if (!raw) {
      return {
        user: null,
        token: null,
        permissions: [],
      };
    }

    const parsed = JSON.parse(raw) as AuthState;
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      permissions: parsed.permissions ?? [],
    };
  } catch {
    return {
      user: null,
      token: null,
      permissions: [],
    };
  }
}

const initialState: AuthState = loadInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<LoginResponse>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.permissions = action.payload.user?.permissions ?? [];

      if (isBrowser) {
        localStorage.setItem(
          "authState",
          JSON.stringify({
            user: state.user,
            token: state.token,
            permissions: state.permissions,
          })
        );
        localStorage.setItem("authToken", state.token ?? "");
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.permissions = [];

      if (isBrowser) {
        localStorage.removeItem("authState");
        localStorage.removeItem("authToken");
      }
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

