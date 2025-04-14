
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
      header: false, // Changed to false since we're dealing with column letters
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          toast.error(`Error parsing CSV: ${results.errors[0].message}`);
          setIsImporting(false);
          return;
        }

        try {
          // Skip header row if present
          const data = results.data.length > 0 ? results.data.slice(1) : [];
          
          if (type === "clients") {
            handleClientImport(data);
          } else if (type === "subclients") {
            handleSubClientImport(data);
          } else if (type === "workentries") {
            handleWorkEntryImport(data);
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
      // Get client name from column C (index 2)
      const clientName = row[2]; // C column (0-indexed)
      const rate = parseFloat(row[10] || "0"); // K column (0-indexed, index 10)
      
      if (clientName && typeof clientName === 'string' && !clientNames.has(clientName)) {
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
      // Get client name from column C (index 2) and subclient from column D (index 3)
      const clientName = String(row[2] || "").toLowerCase(); // C column
      const subClientName = row[3]; // D column
      
      if (!clientName || !subClientName) {
        invalidRows.push(index + 2); // +2 for human-readable row numbers (1-indexed + header)
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
        invalidRows.push(index + 2);
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
        if (!row[2] || !row[3]) { // If C or D column is empty, skip
          invalidRows.push(index + 2);
          return;
        }
        
        // Map CSV columns to our data model
        // B (date), C (Client), D (Subclient), E (project), F (notes), 
        // H (hours), I (bill), J (invoice), K (rate), L (paid)
        
        const dateValue = row[1]; // B column
        const clientName = String(row[2] || "").toLowerCase(); // C column
        const subClientName = String(row[3] || "").toLowerCase(); // D column
        const project = row[4] || ""; // E column
        const notes = row[5] || ""; // F column
        const hours = parseFloat(row[7] || "0"); // H column
        const rate = parseFloat(row[10] || "0"); // K column
        const invoiced = String(row[9] || "").toLowerCase() === "yes"; // J column
        const paid = String(row[11] || "").toLowerCase() === "yes"; // L column
        
        // Parse date - handle different formats
        let date: Date;
        try {
          if (typeof dateValue !== 'string' || !dateValue) {
            throw new Error("Invalid date");
          }
          
          // Try to parse as DD/MM/YYYY
          const dateOnly = dateValue.split(' ')[0]; // Extract date part in case of "DD/MM/YYYY HH:MM"
          const dateParts = dateOnly.split(/[\/\-\.]/);
          
          if (dateParts.length === 3) {
            // Handle both DD/MM/YYYY and MM/DD/YYYY based on reasonable ranges
            const firstPart = parseInt(dateParts[0]);
            const secondPart = parseInt(dateParts[1]);
            
            if (firstPart > 12) { // First part must be day
              date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`); // YYYY-MM-DD
            } else if (firstPart <= 31 && secondPart <= 12) {
              date = new Date(`${dateParts[2]}-${secondPart}-${firstPart}`); // YYYY-MM-DD
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
          console.log(`Row ${index + 2}: Could not parse date "${dateValue}", using today's date instead.`);
        }
        
        const clientId = clientMap.get(clientName);
        if (!clientId) {
          console.log(`Row ${index + 2}: Client "${clientName}" not found`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Find subClientId using the combined key
        const subClientId = subClientMap.get(`${clientName}-${subClientName}`);
        if (!subClientId) {
          console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Validate hours
        if (isNaN(hours) || hours <= 0) {
          console.log(`Row ${index + 2}: Invalid hours value "${row[7]}"`);
          invalidRows.push(index + 2);
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
        console.log(`Error processing row ${index + 2}:`, error);
        invalidRows.push(index + 2);
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
