
export interface Client {
  id: string;
  name: string;
  rate: number;
}

export interface SubClient {
  id: string;
  name: string;
  clientId: string;
}

export interface WorkEntry {
  id: string;
  date: Date;
  clientId: string;
  subClientId: string;
  project: string;
  taskDescription: string;
  fileAttachments: string[];
  hours: number;
  rate: number;
  bill: number;
  invoiced: boolean;
  paid: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  startDate: Date;
  endDate: Date;
  entries: WorkEntry[];
  totalAmount: number;
  createdAt: Date;
}

export interface SubClientSummary {
  subClientId: string;
  subClientName: string;
  clientName: string;
  totalHours: number;
  totalBill: number;
}
