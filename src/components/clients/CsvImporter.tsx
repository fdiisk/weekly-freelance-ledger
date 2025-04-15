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

    // Create lookup maps for clients and subclients
    const clientMap = new Map<string, string>(); // clientName -> clientId
    const subClientMap = new Map<string, string>(); // clientName-subClientName -> subClientId
    
    // Populate client map
    clients.forEach(client => {
      clientMap.set(client.name.toLowerCase(), client.id);
    });
    
    // Populate sub-client map
    subClients.forEach(sc => {
      const client = clients.find(c => c.id === sc.clientId);
      if (client) {
        const key = `${client.name.toLowerCase()}-${sc.name.toLowerCase()}`;
        subClientMap.set(key, sc.id);
      }
    });
    
    console.log("Available clients:", clients.map(c => c.name));
    console.log("Available subclients:", subClients.map(sc => ({
      name: sc.name,
      clientName: clients.find(c => c.id === sc.clientId)?.name
    })));
    
    const validEntries: Omit<WorkEntry, "id">[] = [];
    const invalidRows: number[] = [];
    
    // Process each row in the CSV data
    data.forEach((row, index) => {
      try {
        // Skip rows without required data
        if (!row || !Object.keys(row).length) {
          invalidRows.push(index + 2); // +2 for 1-indexed + header row
          return;
        }
        
        console.log(`Processing row ${index + 1}:`, row);
        
        // Extract values from the row regardless of column case
        const dateValue = row["Date"] || row["DATE"] || row["date"] || "";
        const clientName = row["Clients"] || row["CLIENT"] || row["Client"] || row["clients"] || "";
        const subClientName = row["Sub Client"] || row["SUB CLIENT"] || row["SubClient"] || row["sub client"] || "";
        const project = row["Project"] || row["PROJECT"] || row["project"] || "";
        const taskDescription = row["Task Description"] || row["TASK DESCRIPTION"] || 
                               row["TaskDescription"] || row["task description"] || row["Description"] || "";
        const hoursStr = row["Hours"] || row["HOURS"] || row["hours"] || "";
        const billStr = row["Bill"] || row["BILL"] || row["bill"] || "";
        const rateStr = row["Rate"] || row["RATE"] || row["rate"] || "";
        const invoicedStr = row["Invoiced"] || row["INVOICED"] || row["invoiced"] || "";
        const paidStr = row["Paid"] || row["PAID"] || row["paid"] || "";
        
        // Debug log for extracted values
        console.log(`Row ${index + 2} extracted values:`, {
          dateValue, clientName, subClientName, project, taskDescription,
          hoursStr, billStr, rateStr, invoicedStr, paidStr
        });
        
        // Validate required fields
        if (!dateValue || !clientName || !subClientName) {
          console.log(`Row ${index + 2}: Missing required data (date, client, or subclient)`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Parse date
        let date: Date;
        try {
          // Try different date formats
          if (typeof dateValue === 'string') {
            // Try MM/DD/YYYY or DD/MM/YYYY
            if (dateValue.includes('/')) {
              const parts = dateValue.split('/');
              if (parts.length === 3) {
                const month = parseInt(parts[0]);
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                date = new Date(year, month - 1, day);
              } else {
                date = new Date(dateValue);
              }
            } 
            // Try YYYY-MM-DD
            else if (dateValue.includes('-')) {
              date = new Date(dateValue);
            }
            else {
              // Try Excel serial number date
              const excelSerialDate = parseInt(dateValue);
              if (!isNaN(excelSerialDate)) {
                // Excel dates start at January 0, 1900
                date = new Date(Date.UTC(1899, 11, 30 + excelSerialDate));
              } else {
                date = new Date(dateValue);
              }
            }
          } else {
            date = new Date();
          }
          
          // Validate date
          if (isNaN(date.getTime())) {
            console.log(`Row ${index + 2}: Invalid date "${dateValue}"`);
            date = new Date(); // Fallback to today
          }
        } catch (error) {
          console.log(`Row ${index + 2}: Date parsing error:`, error);
          date = new Date();
        }
        
        // Get client ID
        const clientId = clientMap.get(clientName.toLowerCase());
        if (!clientId) {
          console.log(`Row ${index + 2}: Client "${clientName}" not found`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Get subclient ID
        const key = `${clientName.toLowerCase()}-${subClientName.toLowerCase()}`;
        const subClientId = subClientMap.get(key);
        if (!subClientId) {
          console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Parse hours
        const hours = parseFloat(hoursStr);
        if (isNaN(hours) || hours <= 0) {
          console.log(`Row ${index + 2}: Invalid hours "${hoursStr}"`);
          invalidRows.push(index + 2);
          return;
        }
        
        // Parse rate
        const rate = parseFloat(rateStr);
        if (isNaN(rate)) {
          // If rate is not provided or invalid, use client's default rate
          const client = clients.find(c => c.id === clientId);
          const defaultRate = client ? client.rate : 0;
          console.log(`Row ${index + 2}: Using default client rate ${defaultRate}`);
        }
        
        // Parse bill
        let bill: number;
        if (billStr && !isNaN(parseFloat(billStr))) {
          bill = parseFloat(billStr);
        } else {
          // Calculate bill from hours and rate
          const useRate = !isNaN(rate) ? rate : 
            clients.find(c => c.id === clientId)?.rate || 0;
          bill = hours * useRate;
          console.log(`Row ${index + 2}: Calculated bill ${bill} from hours ${hours} and rate ${useRate}`);
        }
        
        // Parse boolean fields
        const invoiced = /true|yes|y|1/i.test(invoicedStr.toString());
        const paid = /true|yes|y|1/i.test(paidStr.toString());
        
        // Create work entry
        const entry: Omit<WorkEntry, "id"> = {
          date,
          clientId,
          subClientId,
          project: project ? String(project) : "",
          taskDescription: taskDescription ? String(taskDescription) : "",
          fileAttachments: [],
          hours,
          rate: !isNaN(rate) ? rate : clients.find(c => c.id === clientId)?.rate || 0,
          bill,
          invoiced,
          paid,
        };
        
        validEntries.push(entry);
        console.log(`Row ${index + 2}: Successfully created work entry`, entry);
        
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        invalidRows.push(index + 2);
      }
    });
    
    if (validEntries.length) {
      onImportWorkEntries(validEntries);
      toast.success(`Successfully imported ${validEntries.length} work entries`);
    } else {
      toast.error("No valid work entries found in CSV file");
    }
    
    if (invalidRows.length) {
      toast.warning(`Skipped ${invalidRows.length} invalid rows (rows: ${invalidRows.length > 10 ? invalidRows.slice(0, 10).join(", ") + "..." : invalidRows.join(", ")})`);
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
