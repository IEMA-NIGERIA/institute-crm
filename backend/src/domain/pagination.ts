export interface Page<T> {
    items: T[];
    total: number;
}

export interface PageRequest {
    limit: number;
    offset: number;
}
