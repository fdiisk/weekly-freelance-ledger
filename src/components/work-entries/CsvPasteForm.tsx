
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Client, SubClient, WorkEntry } from "@/types";

interface CsvPasteFormProps {
  clients: Client[];
  subClients: SubClient[];
  onSubmit: (data: Omit<WorkEntry, "id" | "bill">) => void;
  onCancel: () => void;
}

const CsvPasteForm: React.FC<CsvPasteFormProps> = ({
  clients,
  subClients,
  onSubmit,
  onCancel,
}) => {
  const [csvText, setCsvText] = useState<string>("");

  // Create lookup maps for clients and subclients
  const clientMap = new Map<string, string>(); // clientName (lowercased) -> clientId
  const clientRateMap = new Map<string, number>(); // clientId -> rate
  const subClientMap = new Map<string, string>(); // "clientName-subClientName" (lowercased) -> subClientId
  
  // Populate client maps
  clients.forEach(client => {
    clientMap.set(client.name.toLowerCase(), client.id);
    clientRateMap.set(client.id, client.rate);
  });
  
  // Populate sub-client map (key: clientName-subClientName in lowercase)
  subClients.forEach(sc => {
    const client = clients.find(c => c.id === sc.clientId);
    if (client) {
      const key = `${client.name.toLowerCase()}-${sc.name.toLowerCase()}`;
      subClientMap.set(key, sc.id);
    }
  });

  const handlePaste = () => {
    try {
      if (!csvText.trim()) {
        toast.error("Please paste some CSV data first");
        return;
      }

      // Parse the pasted CSV data
      const data = csvText.trim();
      const rows = data.split("\n");
      
      if (rows.length === 0) {
        toast.error("No data found in the pasted content");
        return;
      }
      
      // Process first row (assuming one row paste)
      const row = rows[0].split("\t");
      
      if (row.length < 5) {
        toast.error("Insufficient data columns. Expected at least 5 columns");
        return;
      }

      // Extract values based on expected order:
      // Date, Client, SubClient, Project, TaskDescription, Hours, Bill, Invoiced, Rate, Paid
      const [
        dateValue, 
        clientName, 
        subClientName, 
        project, 
        taskDescription, 
        hoursStr, 
        billStr, 
        invoicedStr, 
        rateStr, 
        paidStr
      ] = row;

      console.log("Processing pasted row:", {
        dateValue,
        clientName,
        subClientName,
        project,
        taskDescription,
        hoursStr,
        billStr,
        invoicedStr,
        rateStr,
        paidStr
      });

      // Validate required fields
      if (!dateValue || !clientName || !subClientName || !project || !taskDescription || !hoursStr) {
        toast.error("Missing required data (date, client, subclient, project, description or hours)");
        return;
      }

      // Date parsing: handle format like "10/1/2025 8:30 (GMT+1)"
      let date: Date;
      
      try {
        if (dateValue.includes('/')) {
          // Parse date from MM/DD/YYYY format
          const dateTimeParts = dateValue.split(/\s+/);
          const datePart = dateTimeParts[0];
          const [month, day, year] = datePart.split('/').map(part => parseInt(part, 10));
          
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
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
            throw new Error("Invalid date format");
          }
        } else {
          // Try default JS Date parsing
          date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
          }
        }
      } catch (error) {
        toast.error(`Failed to parse date: ${dateValue}`);
        return;
      }

      // Find client or auto-create
      let clientId = clientMap.get(clientName.trim().toLowerCase());
      if (!clientId) {
        toast.error(`Client "${clientName}" not found. Please create it first.`);
        return;
      }

      // Find subclient or auto-create
      const subClientKey = `${clientName.trim().toLowerCase()}-${subClientName.trim().toLowerCase()}`;
      let subClientId = subClientMap.get(subClientKey);
      if (!subClientId) {
        toast.error(`Sub-client "${subClientName}" not found for client "${clientName}". Please create it first.`);
        return;
      }

      // Parse hours
      let hours: number;
      if (typeof hoursStr === 'number') {
        hours = hoursStr;
      } else {
        hours = parseFloat(String(hoursStr).replace(',', '.'));
      }
      
      if (isNaN(hours) || hours <= 0) {
        toast.error(`Invalid hours value: ${hoursStr}`);
        return;
      }

      // Parse rate - use client rate if not specified
      let rate: number;
      if (rateStr && !isNaN(parseFloat(String(rateStr)))) {
        rate = parseFloat(String(rateStr));
      } else {
        rate = clientRateMap.get(clientId) || 0;
      }

      // Parse boolean fields for invoiced and paid
      let invoiced = false;
      if (invoicedStr) {
        invoiced = /true|yes|y|1/i.test(String(invoicedStr));
      }
      
      let paid = false;
      if (paidStr) {
        paid = /true|yes|y|1/i.test(String(paidStr));
      }

      // Create work entry with the parsed and mapped data
      const entry: Omit<WorkEntry, "id" | "bill"> = {
        date,
        clientId,
        subClientId,
        project: project.trim(),
        taskDescription: taskDescription.trim(),
        fileAttachments: [],
        hours,
        rate,
        invoiced,
        paid,
      };

      // Submit the entry
      onSubmit(entry);
      setCsvText("");
    } catch (error) {
      console.error("Error processing CSV paste:", error);
      toast.error(`Error processing CSV data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Paste a row of CSV data using tab-separated values in this order:
        </p>
        <ol className="pl-4 text-xs text-muted-foreground list-decimal space-y-1">
          <li>Date/Time (e.g. 10/1/2025 8:30 (GMT+1))</li>
          <li>Client</li>
          <li>Sub Client</li>
          <li>Project</li>
          <li>Task Description</li>
          <li>Hours</li>
          <li>Bill (optional)</li>
          <li>Invoiced (Yes/No)</li>
          <li>Rate (optional)</li>
          <li>Paid (Yes/No)</li>
        </ol>
      </div>

      <Textarea
        placeholder="Paste CSV data here..."
        className="min-h-[150px] font-mono text-sm"
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handlePaste}>
          Process Entry
        </Button>
      </div>
    </div>
  );
};

export default CsvPasteForm;
