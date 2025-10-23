
export interface Product {
  id: string;
  retailer_id: string;
  name: string;
  description: string;
  brand: string;
  link: string;
  price: number;
  currency: string;
  imageUrl: string;
  inventory: number;
  videoUrl?: string;
  reviewStatus: 'approved' | 'pending' | 'rejected';
  rejectionReasons?: string[];
}

export interface ProductSet {
  id: string;
  name: string;
  productIds: string[];
}

export type NewProduct = Omit<Product, 'id' | 'reviewStatus' | 'rejectionReasons'>;

export enum ToastType {
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    INFO = 'INFO',
}

export interface ToastMessage {
    id: number;
    type: ToastType;
    message: string;
}

export enum LogLevel {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    WARNING = 'WARNING',
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
}