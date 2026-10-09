import { apiClient, type IHTTPResponse } from "./api"

export interface IAuthUser {
    id: string
    firstName: string
    lastName: string
    email: string
    isActive: boolean
    role: { id: string, title: string, permissions: string[] } | null
    lastLoginAt: string | null
    createdAt: string
}

export interface ILoginPayload {
    email: string
    password: string
}

export const authApi = {
    login: (payload: ILoginPayload): Promise<IHTTPResponse> => apiClient.post("/api/v1/auth/login", payload),
    logout: (): Promise<IHTTPResponse> => apiClient.post("/api/v1/auth/logout"),
    me: (): Promise<IHTTPResponse> => apiClient.get("/api/v1/users/me"),
}
