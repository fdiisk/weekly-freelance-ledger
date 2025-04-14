
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Client, SubClient, WorkEntry } from "@/types";

interface CsvImporterProps {
  type: "clients" | "subclients" | "workentries";
  onImportClients?: (clients: Omit<Client, "id">[]) => void;
  onImportSubClients?: (subClients: Omit<SubClient, "id">[]) => void;
  onImportWorkEntries?: (workEntries: Omit<WorkEntry, "id">[]) => void;
  clients?: Client[];
  subClients?: SubClient[];
}

const CsvImporter: React.FC<CsvImporterProps> = ({
  type,
  onImportClients,
  onImportSubClients,
  onImportWorkEntries,
  clients,
  subClients,
}) => {
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          toast.error(`Error parsing CSV: ${results.errors[0].message}`);
          setIsImporting(false);
          return;
        }

        try {
          if (type === "clients") {
            handleClientImport(results.data);
          } else if (type === "subclients") {
            handleSubClientImport(results.data);
          } else if (type === "workentries") {
            handleWorkEntryImport(results.data);
          }
          
          // Reset the file input
          event.target.value = "";
        } catch (error) {
          toast.error(`Failed to import data: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setIsImporting(false);
        }
      },
    });
  };

  const handleClientImport = (data: any[]) => {
    if (!onImportClients) return;
    
    if (!data.length) {
      toast.error("No data found in CSV file");
      return;
    }

    // Looking for Client column (column C)
    const clients: Omit<Client, "id">[] = [];
    const clientNames = new Set<string>();

    data.forEach((row) => {
      // The column might be named "Client", "C", or another variation
      const clientName = row.Client || row.client || row.C || row.c;
      const rate = parseFloat(row.rate || row.Rate || row.k || row.K || "0");
      
      if (clientName && !clientNames.has(clientName)) {
        clientNames.add(clientName);
        clients.push({
          name: String(clientName),
          rate: isNaN(rate) ? 0 : rate,
        });
      }
    });
    
    if (clients.length === 0) {
      toast.error("No valid client data found in CSV");
      return;
    }
    
    onImportClients(clients);
    toast.success(`Successfully extracted ${clients.length} unique clients`);
  };

  const handleSubClientImport = (data: any[]) => {
    if (!onImportSubClients || !clients) return;
    
    if (!data.length) {
      toast.error("No data found in CSV file");
      return;
    }

    // Map client names to IDs
    const clientMap = new Map(clients.map(client => [client.name.toLowerCase(), client.id]));
    
    const validSubClients: Omit<SubClient, "id">[] = [];
    const subClientMap = new Set<string>();
    const invalidRows: number[] = [];
    
    data.forEach((row, index) => {
      // Look for Client and Subclient columns (columns C and D)
      const clientName = String(row.Client || row.client || row.C || row.c || "").toLowerCase();
      const subClientName = row.Subclient || row.subclient || row.d || row.D;
      
      if (!clientName || !subClientName) {
        invalidRows.push(index + 1); // +1 for human-readable row numbers
        return;
      }
      
      const clientId = clientMap.get(clientName);
      
      if (clientId && !subClientMap.has(`${clientId}-${subClientName}`)) {
        subClientMap.add(`${clientId}-${subClientName}`);
        validSubClients.push({
          name: String(subClientName),
          clientId,
        });
      } else if (!clientId) {
        invalidRows.push(index + 1);
      }
    });
    
    if (invalidRows.length) {
      toast.warning(`Skipped ${invalidRows.length} rows with missing or unknown client names (rows: ${invalidRows.length > 10 ? invalidRows.slice(0, 10).join(", ") + "..." : invalidRows.join(", ")})`);
    }
    
    if (validSubClients.length) {
      onImportSubClients(validSubClients);
      toast.success(`Successfully extracted ${validSubClients.length} unique sub-clients`);
    } else {
      toast.error("No valid sub-clients found in CSV file");
    }
  };

  const handleWorkEntryImport = (data: any[]) => {
    if (!onImportWorkEntries || !clients || !subClients) return;
    
    if (!data.length) {
      toast.error("No data found in CSV file");
      return;
    }

    // Create lookup maps
    const clientMap = new Map(clients.map(client => [client.name.toLowerCase(), client.id]));
    const subClientMap = new Map();
    
    // Populate sub-client map with clientId-subClientName -> subClientId
    subClients.forEach(sc => {
      const client = clients.find(c => c.id === sc.clientId);
      if (client) {
        subClientMap.set(`${client.name.toLowerCase()}-${sc.name.toLowerCase()}`, sc.id);
      }
    });
    
    const validEntries: Omit<WorkEntry, "id">[] = [];
    const invalidRows: number[] = [];
    
    data.forEach((row, index) => {
      try {
        // Map CSV columns to our data model
        // B (date), C (Client), D (Subclient), E (project), F (notes), 
        // H (hours), I (bill), J (invoice), K (rate), L (paid)
        
        const dateValue = row.B || row.Date || row.date;
        const clientName = String(row.C || row.Client || row.client || "").toLowerCase();
        const subClientName = String(row.D || row.d || row.Subclient || row.subclient || "").toLowerCase();
        const project = row.E || row.Project || row.project || "";
        const notes = row.F || row.Notes || row.notes || row.f || "";
        const hours = parseFloat(row.H || row.Hours || row.hours || row.h || "0");
        const rate = parseFloat(row.K || row.Rate || row.rate || row.k || "0");
        const invoiced = (row.J || row.Invoice || row.invoice || row.j || "").toLowerCase() === "yes";
        const paid = (row.L || row.Paid || row.paid || row.l || "").toLowerCase() === "yes";
        
        // Parse date - handle different formats
        let date: Date;
        try {
          // Try to parse as DD/MM/YYYY
          const dateParts = dateValue.split(/[\/\-\.]/);
          if (dateParts.length === 3) {
            // Handle both DD/MM/YYYY and MM/DD/YYYY based on reasonable ranges
            const firstPart = parseInt(dateParts[0]);
            const secondPart = parseInt(dateParts[1]);
            
            if (firstPart > 12) { // First part must be day
              date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`); // YYYY-MM-DD
            } else {
              date = new Date(`${dateParts[2]}-${firstPart}-${secondPart}`); // YYYY-MM-DD
            }
          } else {
            // Try as direct date string
            date = new Date(dateValue);
          }
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
          }
        } catch (error) {
          date = new Date(); // Default to current date if parsing fails
          toast.warning(`Row ${index + 1}: Could not parse date "${dateValue}", using today's date instead.`);
        }
        
        const clientId = clientMap.get(clientName);
        if (!clientId) {
          invalidRows.push(index + 1);
          return;
        }
        
        // Find subClientId using the combined key
        const subClientId = subClientMap.get(`${clientName}-${subClientName}`);
        if (!subClientId) {
          invalidRows.push(index + 1);
          return;
        }
        
        // Validate hours
        if (isNaN(hours) || hours <= 0) {
          invalidRows.push(index + 1);
          return;
        }
        
        // Create work entry
        const bill = hours * rate;
        
        validEntries.push({
          date,
          clientId,
          subClientId,
          project: String(project),
          taskDescription: String(notes),
          fileAttachments: [],
          hours,
          rate,
          bill,
          invoiced,
          paid,
        });
      } catch (error) {
        invalidRows.push(index + 1);
      }
    });
    
    if (invalidRows.length) {
      toast.warning(`Skipped ${invalidRows.length} invalid rows (rows: ${invalidRows.length > 10 ? invalidRows.slice(0, 10).join(", ") + "..." : invalidRows.join(", ")})`);
    }
    
    if (validEntries.length) {
      onImportWorkEntries(validEntries);
      toast.success(`Successfully imported ${validEntries.length} work entries`);
    } else {
      toast.error("No valid work entries found in CSV file");
    }
  };

  return (
    <div className="flex items-center">
      <input
        type="file"
        id={`csv-upload-${type}`}
        className="sr-only"
        onChange={handleFileUpload}
        accept=".csv"
        disabled={isImporting}
      />
      <label htmlFor={`csv-upload-${type}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={
            isImporting || 
            (type === "subclients" && (!clients || clients.length === 0)) ||
            (type === "workentries" && (!clients || !subClients || clients.length === 0 || subClients.length === 0))
          }
          asChild
        >
          <span className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </span>
        </Button>
      </label>
    </div>
  );
};

export default CsvImporter;
