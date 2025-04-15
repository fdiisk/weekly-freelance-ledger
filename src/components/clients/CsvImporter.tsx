const handleWorkEntryImport = (data: any[]) => {
  if (!onImportWorkEntries || !clients || !subClients) return;
  
  if (!data.length) {
    toast.error("No data found in CSV file");
    return;
  }

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
      
      // Extract values using multiple possible header names to account for your CSV format
      const dateValue = row["Date"] || row["DATE"] || row["date"] || "";
      const clientName = row["Clients"] || row["CLIENT"] || row["Client"] || row["clients"] || "";
      const subClientName = row["Sub Client"] || row["SUB CLIENT"] || row["SubClient"] || row["sub client"] || "";
      const project = row["Project"] || row["PROJECT"] || row["project"] || "";
      const taskDescription = row["Task Description"] || row["TASK DESCRIPTION"] || row["TaskDescription"] ||
                              row["task description"] || row["Description"] || row["Notes/description"] || "";
      const hoursStr = row["Hours"] || row["HOURS"] || row["hours"] || "";
      const billStr = row["Bill"] || row["BILL"] || row["bill"] || "";
      const invoicedStr = row["Invoiced"] || row["INVOICED"] || row["invoiced"] ||
                          row["Invoic Yes/No"] || row["invoic yes/no"] || "";
      const rateStr = row["Rate"] || row["RATE"] || row["rate"] || row["rate [derived from client]"] || "";
      const paidStr = row["Paid"] || row["PAID"] || row["paid"] || "";
      
      // Validate required fields: date, client, and subclient
      if (!dateValue || !clientName || !subClientName) {
        console.log(`Row ${index + 2}: Missing required data (date, client, or subclient)`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Date parsing: first try the built-in parser (it can often handle strings like "10/1/2025 8:30 (GMT+1)")
      let date: Date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // Fallback: if the date contains "/" try splitting and removing extra time info
        if (dateValue.includes('/')) {
          const parts = dateValue.split('/');
          if (parts.length >= 3) {
            const month = parseInt(parts[0]);
            // Remove any time information from day part (e.g., "1 8:30 (GMT+1)")
            const dayPart = parts[1].split(' ')[0];
            const day = parseInt(dayPart);
            // Extract year (in case it contains extra info, take the first token)
            const yearPart = parts[2].trim().split(' ')[0];
            const year = parseInt(yearPart);
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
        console.log(`Row ${index + 2}: Client "${clientName}" not found`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Get subclient ID using combined key: "clientName-subClientName"
      const key = `${clientName.toLowerCase()}-${subClientName.toLowerCase()}`;
      const subClientId = subClientMap.get(key);
      if (!subClientId) {
        console.log(`Row ${index + 2}: SubClient "${subClientName}" not found for client "${clientName}"`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Parse hours – must be a positive number
      const hours = parseFloat(hoursStr);
      if (isNaN(hours) || hours <= 0) {
        console.log(`Row ${index + 2}: Invalid hours "${hoursStr}"`);
        invalidRows.push(index + 2);
        return;
      }
      
      // Parse rate: if not valid, later use client's default rate
      const rate = parseFloat(rateStr);
      if (isNaN(rate)) {
        const client = clients.find(c => c.id === clientId);
        console.log(`Row ${index + 2}: Invalid rate "${rateStr}", using client's default rate ${client?.rate || 0}`);
      }
      
      // Parse bill: if not provided or invalid, calculate from hours and rate
      let bill: number;
      if (billStr && !isNaN(parseFloat(billStr))) {
        bill = parseFloat(billStr);
      } else {
        const useRate = !isNaN(rate) ? rate : (clients.find(c => c.id === clientId)?.rate || 0);
        bill = hours * useRate;
        console.log(`Row ${index + 2}: Calculated bill ${bill} from hours ${hours} and rate ${useRate}`);
      }
      
      // Parse boolean fields for invoiced and paid
      const invoiced = /true|yes|y|1/i.test(invoicedStr.toString());
      const paid = /true|yes|y|1/i.test(paidStr.toString());
      
      // Create work entry with the parsed and mapped data
      const entry: Omit<WorkEntry, "id"> = {
        date,
        clientId,
        subClientId,
        project: project ? String(project) : "",
        taskDescription: taskDescription ? String(taskDescription) : "",
        fileAttachments: [],  // Assuming no file attachments come from CSV
        hours,
        rate: !isNaN(rate) ? rate : (clients.find(c => c.id === clientId)?.rate || 0),
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
