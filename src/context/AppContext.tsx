
import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Client, SubClient, WorkEntry, Invoice } from "@/types";
import { calculateBill, generateInvoiceNumber, getLastWeekDateRange, getEntriesForDateRange } from "@/lib/utils";

interface AppContextType {
  clients: Client[];
  subClients: SubClient[];
  workEntries: WorkEntry[];
  invoices: Invoice[];
  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addSubClient: (subClient: Omit<SubClient, "id">) => void;
  updateSubClient: (subClient: SubClient) => void;
  deleteSubClient: (id: string) => void;
  addWorkEntry: (workEntry: Omit<WorkEntry, "id" | "bill">) => void;
  updateWorkEntry: (workEntry: WorkEntry) => void;
  deleteWorkEntry: (id: string) => void;
  generateWeeklyInvoice: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

const STORAGE_KEYS = {
  CLIENTS: "freelance-tracker-clients",
  SUB_CLIENTS: "freelance-tracker-sub-clients",
  WORK_ENTRIES: "freelance-tracker-entries",
  INVOICES: "freelance-tracker-invoices",
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => {
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const initialClients = storedClients ? JSON.parse(storedClients) : [];
    return initialClients;
  });

  const [subClients, setSubClients] = useState<SubClient[]>(() => {
    const storedSubClients = localStorage.getItem(STORAGE_KEYS.SUB_CLIENTS);
    const initialSubClients = storedSubClients ? JSON.parse(storedSubClients) : [];
    return initialSubClients;
  });

  const [workEntries, setWorkEntries] = useState<WorkEntry[]>(() => {
    const storedEntries = localStorage.getItem(STORAGE_KEYS.WORK_ENTRIES);
    const initialEntries = storedEntries ? JSON.parse(storedEntries) : [];
    
    // Convert stored date strings to Date objects
    return initialEntries.map((entry: any) => ({
      ...entry,
      date: new Date(entry.date),
    }));
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const storedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const initialInvoices = storedInvoices ? JSON.parse(storedInvoices) : [];
    
    // Convert stored date strings to Date objects
    return initialInvoices.map((invoice: any) => ({
      ...invoice,
      startDate: new Date(invoice.startDate),
      endDate: new Date(invoice.endDate),
      createdAt: new Date(invoice.createdAt),
      entries: invoice.entries.map((entry: any) => ({
        ...entry,
        date: new Date(entry.date),
      })),
    }));
  });

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUB_CLIENTS, JSON.stringify(subClients));
  }, [subClients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORK_ENTRIES, JSON.stringify(workEntries));
  }, [workEntries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  const addClient = (client: Omit<Client, "id">) => {
    const newClient = { ...client, id: uuidv4() };
    setClients([...clients, newClient]);
    toast.success(`Client "${client.name}" added`);
  };

  const updateClient = (client: Client) => {
    setClients(clients.map(c => (c.id === client.id ? client : c)));
    
    // Update work entries rate if client rate changed
    const clientOld = clients.find(c => c.id === client.id);
    if (clientOld && clientOld.rate !== client.rate) {
      setWorkEntries(
        workEntries.map(entry => {
          if (entry.clientId === client.id && !entry.invoiced) {
            const newRate = client.rate;
            return {
              ...entry,
              rate: newRate,
              bill: calculateBill(entry.hours, newRate),
            };
          }
          return entry;
        })
      );
    }
    
    toast.success(`Client "${client.name}" updated`);
  };

  const deleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const clientHasSubClients = subClients.some(sc => sc.clientId === id);
    const clientHasWorkEntries = workEntries.some(entry => entry.clientId === id);

    if (clientHasSubClients || clientHasWorkEntries) {
      toast.error("Cannot delete client with associated sub-clients or work entries");
      return;
    }

    setClients(clients.filter(c => c.id !== id));
    toast.success(`Client "${client.name}" deleted`);
  };

  const addSubClient = (subClient: Omit<SubClient, "id">) => {
    const newSubClient = { ...subClient, id: uuidv4() };
    setSubClients([...subClients, newSubClient]);
    toast.success("Sub-client added");
  };

  const updateSubClient = (subClient: SubClient) => {
    setSubClients(subClients.map(sc => (sc.id === subClient.id ? subClient : sc)));
    toast.success("Sub-client updated");
  };

  const deleteSubClient = (id: string) => {
    const subClient = subClients.find(sc => sc.id === id);
    if (!subClient) return;

    const subClientHasWorkEntries = workEntries.some(entry => entry.subClientId === id);

    if (subClientHasWorkEntries) {
      toast.error("Cannot delete sub-client with associated work entries");
      return;
    }

    setSubClients(subClients.filter(sc => sc.id !== id));
    toast.success("Sub-client deleted");
  };

  const addWorkEntry = (workEntry: Omit<WorkEntry, "id" | "bill">) => {
    const client = clients.find(c => c.id === workEntry.clientId);
    
    if (!client) {
      toast.error("Invalid client selected");
      return;
    }

    const newEntry: WorkEntry = {
      ...workEntry,
      id: uuidv4(),
      bill: calculateBill(workEntry.hours, workEntry.rate),
    };

    setWorkEntries([...workEntries, newEntry]);
    toast.success("Work entry added");
  };

  const updateWorkEntry = (workEntry: WorkEntry) => {
    setWorkEntries(workEntries.map(we => (we.id === workEntry.id ? workEntry : we)));
    toast.success("Work entry updated");
  };

  const deleteWorkEntry = (id: string) => {
    const entry = workEntries.find(we => we.id === id);
    if (!entry) return;

    if (entry.invoiced) {
      toast.error("Cannot delete an invoiced work entry");
      return;
    }

    setWorkEntries(workEntries.filter(we => we.id !== id));
    toast.success("Work entry deleted");
  };

  const generateWeeklyInvoice = () => {
    const { startDate, endDate } = getLastWeekDateRange();
    const weekEntries = getEntriesForDateRange(
      workEntries.filter(entry => !entry.invoiced),
      startDate,
      endDate
    );

    if (weekEntries.length === 0) {
      toast.error("No uninvoiced entries found for last week");
      return;
    }

    const totalAmount = weekEntries.reduce((sum, entry) => sum + entry.bill, 0);
    
    const newInvoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: generateInvoiceNumber(),
      startDate,
      endDate,
      entries: weekEntries,
      totalAmount,
      createdAt: new Date(),
    };

    setInvoices([...invoices, newInvoice]);
    
    // Mark entries as invoiced
    setWorkEntries(
      workEntries.map(entry => {
        if (weekEntries.some(we => we.id === entry.id)) {
          return { ...entry, invoiced: true };
        }
        return entry;
      })
    );

    toast.success(`Invoice ${newInvoice.invoiceNumber} generated for ${weekEntries.length} entries`);
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        subClients,
        workEntries,
        invoices,
        addClient,
        updateClient,
        deleteClient,
        addSubClient,
        updateSubClient,
        deleteSubClient,
        addWorkEntry,
        updateWorkEntry,
        deleteWorkEntry,
        generateWeeklyInvoice,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
