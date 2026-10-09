import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

export interface IHTTPResponse {
    statusCode: number
    responseBody?: any
    responseHeader?: Record<any, any>
    errorMessage?: any
}

export type UploadProgress = (percent: number) => void

/** Answers a request in place of the network, or returns null to let it through. See ./mock. */
export type MockHandler = (request: {
    method: string
    url: string
    data?: unknown
    onProgress?: UploadProgress
}) => Promise<IHTTPResponse | null>

class Api {
    private readonly httpClient: AxiosInstance
    mock: MockHandler | null = null

    constructor(baseUrl: string) {
        this.httpClient = axios.create({
            baseURL: baseUrl,
            withCredentials: true
        })
    }

    setBaseUrl(baseUrl: string) {
        this.httpClient.defaults.baseURL = baseUrl
    }

    private async request(config: AxiosRequestConfig, onProgress?: UploadProgress): Promise<IHTTPResponse> {
        if (this.mock) {
            const mocked = await this.mock({ method: config.method!.toUpperCase(), url: config.url!, data: config.data, onProgress })
            if (mocked) return mocked
        }
        try {
            const res = await this.httpClient.request({
                ...config,
                onUploadProgress: onProgress && ((event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0)),
            })
            return {
                statusCode: res.status,
                responseBody: res.data,
                responseHeader: res.headers,
            }
        } catch (err) {
            const error = err as AxiosError
            return {
                statusCode: error.response?.status ?? 500,
                responseBody: error.response?.data,
                errorMessage: error.message
            }
        }
    }

    get(path: string): Promise<IHTTPResponse> {
        return this.request({ method: "get", url: path })
    }

    post(path: string, reqBody?: Record<string, any>): Promise<IHTTPResponse> {
        return this.request({ method: "post", url: path, data: reqBody })
    }

    put(path: string, reqBody?: Record<string, any>): Promise<IHTTPResponse> {
        return this.request({ method: "put", url: path, data: reqBody })
    }

    patch(path: string, reqBody?: Record<string, any>): Promise<IHTTPResponse> {
        return this.request({ method: "patch", url: path, data: reqBody })
    }

    delete(path: string): Promise<IHTTPResponse> {
        return this.request({ method: "delete", url: path })
    }

    /** Multipart POST; `onProgress` receives 0–100. */
    upload(path: string, form: FormData, onProgress?: UploadProgress): Promise<IHTTPResponse> {
        return this.request({ method: "post", url: path, data: form }, onProgress)
    }
}

// Base URL and mock are set from runtime config by plugins/api.ts.
export const apiClient = new Api("http://localhost:8080")

/** The message to show for a failed request. */
export const apiErrorMessage = (result: IHTTPResponse, fallback = "Something went wrong.") =>
    result.responseBody?.message ?? result.errorMessage ?? fallback

/** Builds a query string from the defined, non-empty values. */
export const toQuery = (params: Record<string, string | number | null | undefined>) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") query.set(key, String(value))
    }
    const text = query.toString()
    return text ? `?${text}` : ""
}
