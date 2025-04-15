
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
      
      // Detect date column (could be "Date", "10/1/2025", etc.)
      const dateColumn = columnKeys.find(key => 
        key.toLowerCase().includes("date") || 
        /\d{1,2}\/\d{1,2}\/\d{4}/.test(key)
      );
      
      // Detect client column (look for columns that might contain client names)
      const clientColumn = columnKeys.find(key => 
        key.toLowerCase().includes("client") || 
        key.toLowerCase() === "p&a"
      );
      
      // Detect sub-client column
      const subClientColumn = columnKeys.find(key => 
        key.toLowerCase().includes("sub client") || 
        key.toLowerCase() === "fairview"
      );
      
      // Detect project column
      const projectColumn = columnKeys.find(key => 
        key.toLowerCase().includes("project") || 
        key.toLowerCase() === "graphic design"
      );
      
      // Detect description column
      const descriptionColumn = columnKeys.find(key => 
        key.toLowerCase().includes("description") || 
        key.toLowerCase().includes("task") ||
        key.toLowerCase() === "asset collection and export"
      );
      
      // Detect hours column
      const hoursColumn = columnKeys.find(key => 
        key.toLowerCase().includes("hours") || 
        key.toLowerCase() === "1.5"
      );
      
      // Try to find other columns
      const billColumn = columnKeys.find(key => key.toLowerCase().includes("bill"));
      const invoicedColumn = columnKeys.find(key => 
        key.toLowerCase().includes("invoic") || 
        key === "Yes"
      );
      const rateColumn = columnKeys.find(key => key.toLowerCase().includes("rate"));
      const paidColumn = columnKeys.find(key => 
        key.toLowerCase().includes("paid") || 
        key === "Yes_1"
      );
      
      console.log("Detected columns:", {
        dateColumn,
        clientColumn,
        subClientColumn,
        projectColumn,
        descriptionColumn,
        hoursColumn,
        billColumn,
        invoicedColumn,
        rateColumn,
        paidColumn
      });
      
      // Extract values using detected column names
      const dateValue = dateColumn ? row[dateColumn] : "";
      const clientName = clientColumn ? row[clientColumn] : "";
      const subClientName = subClientColumn ? row[subClientColumn] : "";
      const project = projectColumn ? row[projectColumn] : "";
      const taskDescription = descriptionColumn ? row[descriptionColumn] : "";
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
      
      // Date parsing: first try the built-in parser (it can often handle strings like "10/1/2025 8:30 (GMT+1)")
      let date: Date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // Fallback: try to parse dates like "25/03/2025 7:30 (GMT)"
        if (typeof dateValue === 'string' && dateValue.includes('/')) {
          const dateParts = dateValue.split(/[\s]/)[0].split('/');
          if (dateParts.length >= 3) {
            // Handle both DD/MM/YYYY and MM/DD/YYYY formats
            const isMMDDYYYY = dateParts[0].length <= 2 && parseInt(dateParts[0]) <= 12;
            
            let day: number, month: number, year: number;
            if (isMMDDYYYY) {
              month = parseInt(dateParts[0]);
              day = parseInt(dateParts[1]);
              year = parseInt(dateParts[2]);
            } else {
              day = parseInt(dateParts[0]);
              month = parseInt(dateParts[1]);
              year = parseInt(dateParts[2]);
            }
            
            date = new Date(year, month - 1, day);
          }
        }
        
        if (isNaN(date.getTime())) {
          console.log(`Row ${index + 2}: Invalid date "${dateValue}", defaulting to current date`);
          date = new Date();
        }
      }
      
      // Get client ID using case-insensitive mapping
      const clientId = clientMap.get(clientName.toLowerCase());
      if (!clientId) {
        console.log(`Row ${index + 2}: Client "${clientName}" not found. Available clients:`, 
          clients.map(c => c.name));
        invalidRows.push(index + 2);
        return;
      }
      
      // Get subclient ID using combined key: "clientName-subClientName"
      const key = `${clientName.toLowerCase()}-${subClientName.toLowerCase()}`;
      const subClientId = subClientMap.get(key);
      if (!subClientId) {
        console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
        console.log("Available subclients:", subClients.map(sc => {
          const client = clients.find(c => c.id === sc.clientId);
          return `${client?.name}-${sc.name}`;
        }));
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
        console.log(`Row ${index + 2}: Invalid hours "${hoursStr}"`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Parse rate: if not valid, use client's default rate
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
        project: project ? String(project) : "",
        taskDescription: taskDescription ? String(taskDescription) : "",
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
