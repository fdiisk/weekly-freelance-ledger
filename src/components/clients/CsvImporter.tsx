
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
      header: true, // Changed to true to use column names
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          toast.error(`Error parsing CSV: ${results.errors[0].message}`);
          setIsImporting(false);
          return;
        }

        try {
          console.log("CSV Parse Result:", results.data);
          
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

    // Expected column: "Clients"
    const clients: Omit<Client, "id">[] = [];
    const clientNames = new Set<string>();
    
    data.forEach((row) => {
      // Check for expected column names with case insensitivity
      const clientsColumn = Object.keys(row).find(key => 
        key.toLowerCase() === "clients" || 
        key.toLowerCase() === "client"
      );
      
      const rateColumn = Object.keys(row).find(key => 
        key.toLowerCase() === "rate"
      );

      if (!clientsColumn) {
        console.log("Client column not found in row:", row);
        return;
      }
      
      const clientName = row[clientsColumn];
      const rate = rateColumn && row[rateColumn] ? parseFloat(row[rateColumn]) : 0;
      
      if (clientName && typeof clientName === 'string' && clientName.trim() !== '' && !clientNames.has(clientName)) {
        clientNames.add(clientName);
        clients.push({
          name: clientName.trim(),
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

    // Expected columns: "Clients" and "Sub Client"
    // Map client names to IDs
    const clientMap = new Map(clients.map(client => [client.name.toLowerCase(), client.id]));
    
    const validSubClients: Omit<SubClient, "id">[] = [];
    const subClientMap = new Set<string>();
    const invalidRows: number[] = [];
    
    data.forEach((row, index) => {
      // Find the client and subclient columns
      const clientsColumn = Object.keys(row).find(key => 
        key.toLowerCase() === "clients" || 
        key.toLowerCase() === "client"
      );
      
      const subClientColumn = Object.keys(row).find(key => 
        key.toLowerCase() === "sub client" || 
        key.toLowerCase() === "subclient"
      );
      
      if (!clientsColumn || !subClientColumn) {
        invalidRows.push(index + 2); // +2 for human-readable row numbers (1-indexed + header)
        return;
      }
      
      const clientName = row[clientsColumn] ? String(row[clientsColumn]).trim().toLowerCase() : "";
      const subClientName = row[subClientColumn] ? String(row[subClientColumn]).trim() : "";
      
      if (!clientName || !subClientName) {
        invalidRows.push(index + 2);
        return;
      }
      
      const clientId = clientMap.get(clientName);
      
      if (clientId && !subClientMap.has(`${clientId}-${subClientName}`)) {
        subClientMap.add(`${clientId}-${subClientName}`);
        validSubClients.push({
          name: subClientName,
          clientId,
        });
      } else if (!clientId) {
        console.log(`Row ${index + 2}: Client "${clientName}" not found in the system`);
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
    
    // Expected columns based on the image: 
    // Date, Clients, Sub Client, Project, Task Description, Hours, Bill, Invoiced, Rate, Paid
    
    console.log("Processing work entries. Available clients:", clients.map(c => c.name));
    console.log("Available subclients:", subClients.map(sc => ({ 
      name: sc.name, 
      clientId: sc.clientId,
      clientName: clients.find(c => c.id === sc.clientId)?.name 
    })));
    
    data.forEach((row, index) => {
      try {
        // Find the columns by name (case-insensitive)
        const dateColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "date"
        );
        const clientsColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "clients" || 
          key.toLowerCase() === "client"
        );
        const subClientColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "sub client" || 
          key.toLowerCase() === "subclient"
        );
        const projectColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "project"
        );
        const taskDescColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "task description" ||
          key.toLowerCase() === "taskdescription" ||
          key.toLowerCase() === "description"
        );
        const hoursColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "hours"
        );
        const billColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "bill"
        );
        const invoicedColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "invoiced"
        );
        const rateColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "rate"
        );
        const paidColumn = Object.keys(row).find(key => 
          key.toLowerCase() === "paid"
        );
        
        // Log found columns for debugging
        console.log(`Row ${index + 2}: Found columns:`, { 
          dateColumn, 
          clientsColumn, 
          subClientColumn,
          projectColumn,
          taskDescColumn,
          hoursColumn,
          billColumn,
          invoicedColumn,
          rateColumn,
          paidColumn
        });
        
        // Required columns check
        if (!dateColumn || !clientsColumn || !subClientColumn || !hoursColumn) {
          console.log(`Row ${index + 2}: Missing required columns`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Get values from the row
        const dateValue = row[dateColumn];
        const clientName = row[clientsColumn] ? String(row[clientsColumn]).trim().toLowerCase() : "";
        const subClientName = row[subClientColumn] ? String(row[subClientColumn]).trim().toLowerCase() : "";
        const project = projectColumn ? row[projectColumn] || "" : "";
        const taskDescription = taskDescColumn ? row[taskDescColumn] || "" : "";
        const hours = hoursColumn ? parseFloat(row[hoursColumn]) : 0;
        const rate = rateColumn ? parseFloat(row[rateColumn]) : 0;
        const invoiced = invoicedColumn ? String(row[invoicedColumn]).toLowerCase() === "yes" : false;
        const paid = paidColumn ? String(row[paidColumn]).toLowerCase() === "yes" : false;
        
        console.log(`Row ${index + 2}: Parsed values:`, { 
          dateValue, 
          clientName, 
          subClientName,
          project,
          taskDescription,
          hours,
          rate,
          invoiced,
          paid
        });
        
        // Parse date
        let date: Date;
        try {
          if (!dateValue) {
            throw new Error("Missing date value");
          }
          
          // Try to parse as DD/MM/YYYY
          if (typeof dateValue === 'string') {
            const dateOnly = dateValue.split(' ')[0]; // Extract date part
            const dateParts = dateOnly.split(/[\/\-\.]/);
            
            if (dateParts.length === 3) {
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
          } else if (dateValue instanceof Date) {
            date = dateValue;
          } else {
            throw new Error("Invalid date format");
          }
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
          }
        } catch (error) {
          console.log(`Row ${index + 2}: Date parsing error:`, error);
          date = new Date(); // Default to current date
          console.log(`Row ${index + 2}: Using today's date instead of "${dateValue}"`);
        }
        
        // Find clientId
        const clientId = clientMap.get(clientName);
        if (!clientId) {
          console.log(`Row ${index + 2}: Client "${clientName}" not found in the system`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Find subClientId
        const subClientId = subClientMap.get(`${clientName}-${subClientName}`);
        if (!subClientId) {
          console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Validate hours
        if (isNaN(hours) || hours <= 0) {
          console.log(`Row ${index + 2}: Invalid hours value "${row[hoursColumn]}"`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Calculate bill if not provided
        const bill = billColumn && row[billColumn] ? parseFloat(row[billColumn]) : hours * rate;
        
        // Create work entry
        validEntries.push({
          date,
          clientId,
          subClientId,
          project: String(project),
          taskDescription: String(taskDescription),
          fileAttachments: [],
          hours,
          rate,
          bill: isNaN(bill) ? hours * rate : bill,
          invoiced,
          paid,
        });
        
        console.log(`Row ${index + 2}: Successfully created work entry`);
        
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
