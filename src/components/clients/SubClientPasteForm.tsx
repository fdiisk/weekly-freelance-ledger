
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Client, SubClient } from "@/types";

interface SubClientPasteFormProps {
  clients: Client[];
  onSubmit: (subClients: Omit<SubClient, "id">[]) => void;
  onCancel: () => void;
}

const SubClientPasteForm: React.FC<SubClientPasteFormProps> = ({
  clients,
  onSubmit,
  onCancel,
}) => {
  const [pasteText, setPasteText] = useState<string>("");

  // Create lookup map for clients
  const clientMap = new Map<string, string>(); // clientName (lowercased) -> clientId
  
  // Populate client map
  clients.forEach(client => {
    clientMap.set(client.name.toLowerCase(), client.id);
  });

  const handlePaste = () => {
    try {
      if (!pasteText.trim()) {
        toast.error("Please paste some data first");
        return;
      }

      // Parse the pasted data
      const data = pasteText.trim();
      const rows = data.split("\n");
      
      if (rows.length === 0) {
        toast.error("No data found in the pasted content");
        return;
      }
      
      const subClientsToAdd: Omit<SubClient, "id">[] = [];
      const errors: string[] = [];

      // Process each row
      rows.forEach((row, index) => {
        // Split by tab or multiple spaces
        const columns = row.split(/\t|  +/);
        
        // We expect at least client name and subclient name
        if (columns.length < 2) {
          errors.push(`Row ${index + 1}: Insufficient data columns. Expected at least client name and subclient name`);
          return;
        }

        const clientName = columns[0].trim();
        const subClientName = columns[1].trim();
        
        if (!clientName || !subClientName) {
          errors.push(`Row ${index + 1}: Missing client name or subclient name`);
          return;
        }

        // Find client ID
        const clientId = clientMap.get(clientName.toLowerCase());
        if (!clientId) {
          errors.push(`Row ${index + 1}: Client "${clientName}" not found. Please create it first.`);
          return;
        }

        // Add to the list
        subClientsToAdd.push({
          name: subClientName,
          clientId,
        });
      });

      // Show errors if any
      if (errors.length > 0) {
        const errorMessage = errors.length > 3 
          ? `${errors.slice(0, 3).join('\n')}\n... and ${errors.length - 3} more errors` 
          : errors.join('\n');
        toast.error(errorMessage);
        
        if (subClientsToAdd.length > 0) {
          toast.info(`Processed ${subClientsToAdd.length} valid subclients despite errors`);
        }
      }

      if (subClientsToAdd.length === 0) {
        toast.error("No valid subclients found to add");
        return;
      }

      // Submit the valid subclients
      onSubmit(subClientsToAdd);
      setPasteText("");
      toast.success(`${subClientsToAdd.length} subclients added successfully`);
    } catch (error) {
      console.error("Error processing pasted data:", error);
      toast.error(`Error processing data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Paste multiple subclients data with tab-separated values in this order:
        </p>
        <ol className="pl-4 text-xs text-muted-foreground list-decimal space-y-1">
          <li>Client Name (must exist in the system)</li>
          <li>Sub Client Name</li>
        </ol>
        <p className="text-xs text-muted-foreground italic">
          Each row will create a new subclient under the specified client.
        </p>
      </div>

      <Textarea
        placeholder="Example:
Client A	Subclient 1
Client A	Subclient 2
Client B	Subclient 3"
        className="min-h-[150px] font-mono text-sm"
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handlePaste}>
          Add Subclients
        </Button>
      </div>
    </div>
  );
};

export default SubClientPasteForm;
