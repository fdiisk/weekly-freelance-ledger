
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Client, SubClient } from "@/types";

interface CsvImporterProps {
  type: "clients" | "subclients";
  onImportClients?: (clients: Omit<Client, "id">[]) => void;
  onImportSubClients?: (subClients: Omit<SubClient, "id">[]) => void;
  clients?: Client[];
}

const CsvImporter: React.FC<CsvImporterProps> = ({
  type,
  onImportClients,
  onImportSubClients,
  clients,
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

    // Validate CSV structure for clients
    const requiredFields = ["name", "rate"];
    const missingFields = requiredFields.filter(
      (field) => !Object.keys(data[0]).includes(field)
    );
    
    if (missingFields.length) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    const clients: Omit<Client, "id">[] = data.map((row) => ({
      name: String(row.name),
      rate: parseFloat(row.rate) || 0,
    }));
    
    onImportClients(clients);
    toast.success(`Successfully imported ${clients.length} clients`);
  };

  const handleSubClientImport = (data: any[]) => {
    if (!onImportSubClients || !clients) return;
    
    if (!data.length) {
      toast.error("No data found in CSV file");
      return;
    }

    // Validate CSV structure for sub-clients
    const requiredFields = ["name", "clientName"];
    const missingFields = requiredFields.filter(
      (field) => !Object.keys(data[0]).includes(field)
    );
    
    if (missingFields.length) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    // Map client names to IDs
    const clientMap = new Map(clients.map(client => [client.name.toLowerCase(), client.id]));
    
    const validSubClients: Omit<SubClient, "id">[] = [];
    const invalidRows: number[] = [];
    
    data.forEach((row, index) => {
      const clientName = String(row.clientName).toLowerCase();
      const clientId = clientMap.get(clientName);
      
      if (clientId) {
        validSubClients.push({
          name: String(row.name),
          clientId,
        });
      } else {
        invalidRows.push(index + 1); // +1 for human-readable row numbers (header is row 1)
      }
    });
    
    if (invalidRows.length) {
      toast.warning(`Skipped ${invalidRows.length} rows with unknown client names (rows: ${invalidRows.join(", ")})`);
    }
    
    if (validSubClients.length) {
      onImportSubClients(validSubClients);
      toast.success(`Successfully imported ${validSubClients.length} sub-clients`);
    } else {
      toast.error("No valid sub-clients found in CSV file");
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
          disabled={isImporting || (type === "subclients" && (!clients || clients.length === 0))}
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
