
import React from 'react';
import Papa from 'papaparse';
import { WorkEntry, Client, SubClient } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileIcon, UploadIcon } from 'lucide-react';

interface CsvImporterProps {
  type: 'clients' | 'subclients' | 'workentries';
  onImportWorkEntries?: (entries: Omit<WorkEntry, 'id'>[]) => void;
  onImportClients?: (clients: Omit<Client, 'id'>[]) => void;
  onImportSubClients?: (subClients: Omit<SubClient, 'id'>[]) => void;
  clients?: Client[];
  subClients?: SubClient[];
}

export const CsvImporter: React.FC<CsvImporterProps> = ({
  type,
  onImportWorkEntries,
  onImportClients,
  onImportSubClients,
  clients = [],
  subClients = [],
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (type === 'clients' && onImportClients) {
          handleClientImport(results.data);
        } else if (type === 'subclients' && onImportSubClients) {
          handleSubClientImport(results.data);
        } else if (type === 'workentries' && onImportWorkEntries) {
          handleWorkEntryImport(results.data);
        }
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleClientImport = (data: any[]) => {
    if (!onImportClients) return;
    
    // Implementation of client import logic...
    // This can be implemented based on requirements
    toast.info("Client import functionality is not yet implemented");
  };

  const handleSubClientImport = (data: any[]) => {
    if (!onImportSubClients) return;
    
    // Implementation of subclient import logic...
    // This can be implemented based on requirements
    toast.info("SubClient import functionality is not yet implemented");
  };

const handleWorkEntryImport = (data: any[]) => {
  if (!onImportWorkEntries || !clients || !subClients) return;
  
  if (!data.length) {
    toast.error("No data found in CSV file");
    return;
  }

  console.log("Raw CSV data:", data);
  console.log("First row:", data[0]);

  // Create lookup maps for clients and subclients
  const clientMap = new Map<string, string>(); // clientName (lowercased) -> clientId
  const subClientMap = new Map<string, string>(); // "clientName-subClientName" (lowercased) -> subClientId
  
  // Populate client map
  clients.forEach(client => {
    clientMap.set(client.name.toLowerCase(), client.id);
  });
  
  // Populate sub-client map (key: clientName-subClientName in lowercase)
  subClients.forEach(sc => {
    const client = clients.find(c => c.id === sc.clientId);
    if (client) {
      const key = `${client.name.toLowerCase()}-${sc.name.toLowerCase()}`;
      subClientMap.set(key, sc.id);
    }
  });
  
  console.log("Available clients:", clients.map(c => c.name));
  console.log("Available subclients:", subClients.map(sc => {
    const clientName = clients.find(c => c.id === sc.clientId)?.name;
    return { name: sc.name, clientName };
  }));
  
  const validEntries: Omit<WorkEntry, "id">[] = [];
  const invalidRows: number[] = [];
  
  data.forEach((row, index) => {
    try {
      // Skip empty rows
      if (!row || !Object.keys(row).length) {
        invalidRows.push(index + 2); // +2 for header and 1-indexed row number
        return;
      }
      
      console.log(`Processing row ${index + 2}:`, row);
      
      // Get column headers from the first row
      const columnKeys = Object.keys(row);
      
      // Explicitly map Excel columns to our fields based on the user's specification
      // A: Date/Time - 10/1/2025 8:30 (GMT+1)
      // B: Client - P&A
      // C: Sub Client - Fairview
      // D: Project - Comms
      // E: Notes - Teams with Kym
      // F: Hours - 0.5
      // G: Bill - 18
      // H: Invoiced - Yes or No
      // I: Rate - 36
      // J: Paid - Yes or No
      
      // Find the appropriate columns
      let dateColumn, clientColumn, subClientColumn, projectColumn, 
          notesColumn, hoursColumn, billColumn, invoicedColumn, rateColumn, paidColumn;
          
      // Check for standard column names first
      dateColumn = columnKeys.find(key => /^a\s*date/i.test(key) || /date/i.test(key)) || columnKeys[0];
      clientColumn = columnKeys.find(key => /^b\s*client/i.test(key) || /client/i.test(key)) || columnKeys[1];
      subClientColumn = columnKeys.find(key => /^c\s*sub/i.test(key) || /sub client/i.test(key)) || columnKeys[2];
      projectColumn = columnKeys.find(key => /^d\s*project/i.test(key) || /project/i.test(key)) || columnKeys[3];
      notesColumn = columnKeys.find(key => /^e\s*notes/i.test(key) || /notes|description|task/i.test(key)) || columnKeys[4];
      hoursColumn = columnKeys.find(key => /^f\s*hours/i.test(key) || /hours/i.test(key)) || columnKeys[5];
      billColumn = columnKeys.find(key => /^g\s*bill/i.test(key) || /bill|billing/i.test(key)) || columnKeys[6];
      invoicedColumn = columnKeys.find(key => /^h\s*invoiced/i.test(key) || /invoiced/i.test(key)) || columnKeys[7];
      rateColumn = columnKeys.find(key => /^i\s*rate/i.test(key) || /rate/i.test(key)) || columnKeys[8];
      paidColumn = columnKeys.find(key => /^j\s*paid/i.test(key) || /paid/i.test(key)) || columnKeys[9];
      
      console.log("Detected columns:", {
        dateColumn,
        clientColumn,
        subClientColumn,
        projectColumn,
        notesColumn,
        hoursColumn,
        billColumn,
        invoicedColumn,
        rateColumn,
        paidColumn
      });
      
      // Extract values using detected column names
      const dateValue = dateColumn ? row[dateColumn] : "";
      const clientName = clientColumn ? String(row[clientColumn]).trim() : "";
      const subClientName = subClientColumn ? String(row[subClientColumn]).trim() : "";
      const project = projectColumn ? String(row[projectColumn]).trim() : "";
      const taskDescription = notesColumn ? String(row[notesColumn]).trim() : "";
      const hoursStr = hoursColumn ? row[hoursColumn] : "";
      const billStr = billColumn ? row[billColumn] : "";
      const invoicedStr = invoicedColumn ? row[invoicedColumn] : "";
      const rateStr = rateColumn ? row[rateColumn] : "";
      const paidStr = paidColumn ? row[paidColumn] : "";
      
      console.log(`Row ${index + 2} extracted values:`, {
        dateValue,
        clientName,
        subClientName,
        project,
        taskDescription,
        hoursStr,
        billStr,
        rateStr,
        invoicedStr,
        paidStr
      });
      
      // Validate required fields: date, client, and subclient
      if (!dateValue || !clientName || !subClientName) {
        console.log(`Row ${index + 2}: Missing required data (date, client, or subclient)`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Date parsing: handle format like "10/1/2025 8:30 (GMT+1)"
      let date: Date;
      
      if (typeof dateValue === 'string') {
        // Try different date formats
        // First, separate date part from time and timezone
        const dateTimeParts = dateValue.split(/\s+/);
        const datePart = dateTimeParts[0];
        
        if (datePart.includes('/')) {
          const [month, day, year] = datePart.split('/').map(part => parseInt(part, 10));
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            // Assuming MM/DD/YYYY format
            date = new Date(year, month - 1, day);
            
            // Add time if available
            if (dateTimeParts.length > 1) {
              const timePart = dateTimeParts[1].replace(/[()]/g, '');
              const [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
              if (!isNaN(hours) && !isNaN(minutes)) {
                date.setHours(hours, minutes);
              }
            }
          } else {
            // Fallback if parsing failed
            date = new Date();
            console.log(`Row ${index + 2}: Failed to parse date "${dateValue}", using current date`);
          }
        } else {
          // Try default JS Date parsing
          date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            date = new Date();
            console.log(`Row ${index + 2}: Invalid date "${dateValue}", using current date`);
          }
        }
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date();
        console.log(`Row ${index + 2}: Date is not a string or Date object, using current date`);
      }
      
      // Let's check if the client exists, if not, create it
      let clientId = clientMap.get(clientName.toLowerCase());
      console.log(`Row ${index + 2}: Client "${clientName}" lookup result: ${clientId || "not found"}`);
      
      // If client not found, let the user know for now
      if (!clientId) {
        console.log(`Row ${index + 2}: Client "${clientName}" not found.`);
        console.log(`You should create client "${clientName}" manually before importing.`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Let's check if the subclient exists, if not, let the user know
      const key = `${clientName.toLowerCase()}-${subClientName.toLowerCase()}`;
      const subClientId = subClientMap.get(key);
      console.log(`Row ${index + 2}: SubClient lookup key "${key}" result: ${subClientId || "not found"}`);
      
      if (!subClientId) {
        console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
        console.log(`You should create subclient "${subClientName}" under client "${clientName}" manually before importing.`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Parse hours – must be a positive number
      let hours: number;
      if (typeof hoursStr === 'number') {
        hours = hoursStr;
      } else {
        hours = parseFloat(String(hoursStr).replace(',', '.'));
      }
      
      if (isNaN(hours) || hours <= 0) {
        console.log(`Row ${index + 2}: Invalid hours "${hoursStr}", must be a positive number`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Parse rate
      let rate: number;
      if (typeof rateStr === 'number') {
        rate = rateStr;
      } else if (rateStr && !isNaN(parseFloat(String(rateStr)))) {
        rate = parseFloat(String(rateStr));
      } else {
        const client = clients.find(c => c.id === clientId);
        rate = client?.rate || 0;
        console.log(`Row ${index + 2}: Using client's default rate ${rate}`);
      }
      
      // Parse bill: if not provided or invalid, calculate from hours and rate
      let bill: number;
      if (typeof billStr === 'number') {
        bill = billStr;
      } else if (billStr && !isNaN(parseFloat(String(billStr)))) {
        bill = parseFloat(String(billStr));
      } else {
        bill = hours * rate;
        console.log(`Row ${index + 2}: Calculated bill ${bill} from hours ${hours} and rate ${rate}`);
      }
      
      // Parse boolean fields for invoiced and paid
      let invoiced = false;
      if (typeof invoicedStr === 'boolean') {
        invoiced = invoicedStr;
      } else if (invoicedStr) {
        invoiced = /true|yes|y|1/i.test(String(invoicedStr));
      }
      
      let paid = false;
      if (typeof paidStr === 'boolean') {
        paid = paidStr;
      } else if (paidStr) {
        paid = /true|yes|y|1/i.test(String(paidStr));
      }
      
      // Create work entry with the parsed and mapped data
      const entry: Omit<WorkEntry, "id"> = {
        date,
        clientId,
        subClientId,
        project: project || "",
        taskDescription: taskDescription || "",
        fileAttachments: [],  // Assuming no file attachments come from CSV
        hours,
        rate,
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
    toast.warning(`Skipped ${invalidRows.length} invalid rows (e.g., rows: ${
      invalidRows.length > 10 ? invalidRows.slice(0, 10).join(", ") + "..." : invalidRows.join(", ")
    })`);
  }
};

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="flex items-center gap-2"
      >
        <UploadIcon size={16} />
        Import {type === 'clients' ? 'Clients' : type === 'subclients' ? 'Sub-clients' : 'Work Entries'}
      </Button>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
    </div>
  );
};

export default CsvImporter;
