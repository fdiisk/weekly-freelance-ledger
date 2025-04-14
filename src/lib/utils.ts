
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFnsFormat } from "date-fns";
import { Client, SubClient, WorkEntry, SubClientSummary } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return dateFnsFormat(date, "yyyy-MM-dd");
}

export function formatDateTime(date: Date): string {
  return dateFnsFormat(date, "yyyy-MM-dd HH:mm");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function calculateBill(hours: number, rate: number): number {
  return hours * rate;
}

export function generateInvoiceNumber(): string {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  
  return `INV-${year}${month}${day}-${random}`;
}

export function getLastWeekDateRange(): { startDate: Date; endDate: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate days to go back to previous Monday
  const daysToLastMonday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysToLastSunday = dayOfWeek === 0 ? 1 : dayOfWeek + 7;
  
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);
  
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysToLastSunday + 7);
  lastSunday.setHours(23, 59, 59, 999);
  
  return { startDate: lastMonday, endDate: lastSunday };
}

export function getEntriesForDateRange(entries: WorkEntry[], startDate: Date, endDate: Date): WorkEntry[] {
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

export function calculateSubClientSummaries(entries: WorkEntry[], clients: Client[], subClients: SubClient[]): SubClientSummary[] {
  const subClientMap: Record<string, SubClientSummary> = {};
  
  entries.forEach(entry => {
    const subClient = subClients.find(sc => sc.id === entry.subClientId);
    const client = clients.find(c => c.id === entry.clientId);
    
    if (!subClient || !client) return;
    
    if (!subClientMap[entry.subClientId]) {
      subClientMap[entry.subClientId] = {
        subClientId: entry.subClientId,
        subClientName: subClient.name,
        clientName: client.name,
        totalHours: 0,
        totalBill: 0,
      };
    }
    
    subClientMap[entry.subClientId].totalHours += entry.hours;
    subClientMap[entry.subClientId].totalBill += entry.bill;
  });
  
  return Object.values(subClientMap);
}
