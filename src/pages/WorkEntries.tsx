
import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon, FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import PageLayout from "@/components/layout/PageLayout";
import WorkEntryForm from "@/components/work-entries/WorkEntryForm";
import { useApp } from "@/context/AppContext";
import { WorkEntry } from "@/types";
import { formatCurrency } from "@/lib/utils";
import CsvImporter from "@/components/clients/CsvImporter";

const WorkEntries: React.FC = () => {
  const { clients, subClients, workEntries, addWorkEntry, updateWorkEntry, deleteWorkEntry, importWorkEntries } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | undefined>(undefined);

  const handleAdd = () => {
    setSelectedEntry(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: WorkEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDelete = (entry: WorkEntry) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteWorkEntry(entry.id);
    }
  };

  const handleFormSubmit = (data: Omit<WorkEntry, "id" | "bill">) => {
    if (selectedEntry) {
      updateWorkEntry({
        ...selectedEntry,
        ...data,
        bill: data.hours * data.rate,
      });
      toast.success("Work entry updated");
    } else {
      addWorkEntry(data);
      toast.success("Work entry added");
    }
    setIsDialogOpen(false);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  // Get client and subclient names
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  const getSubClientName = (subClientId: string) => {
    const subClient = subClients.find((sc) => sc.id === subClientId);
    return subClient ? subClient.name : "Unknown Sub-client";
  };

  // Sort work entries by date (newest first)
  const sortedEntries = [...workEntries].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <PageLayout
      title="Work Entries"
      actions={
        <div className="flex items-center gap-2">
          <CsvImporter 
            type="workentries" 
            onImportWorkEntries={importWorkEntries} 
            clients={clients} 
            subClients={subClients} 
          />
          <Button onClick={handleAdd}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      }
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Project</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden md:table-cell">Files</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Bill</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  No work entries found. Click "Add Entry" to create your first entry.
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {format(new Date(entry.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div>{getClientName(entry.clientId)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getSubClientName(entry.subClientId)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {entry.project}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate">
                    {entry.taskDescription}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {entry.fileAttachments && entry.fileAttachments.length > 0 ? (
                      <Badge variant="outline">
                        <FileIcon size={14} className="mr-1" />
                        {entry.fileAttachments.length}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.hours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(entry.bill)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex items-center space-x-1">
                        <Checkbox checked={entry.invoiced} disabled />
                        <span className="text-xs">Invoiced</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Checkbox checked={entry.paid} disabled />
                        <span className="text-xs">Paid</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(entry)}
                      >
                        <PencilIcon size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(entry)}
                        disabled={entry.invoiced}
                      >
                        <TrashIcon size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? "Edit Work Entry" : "Add Work Entry"}
            </DialogTitle>
          </DialogHeader>
          <WorkEntryForm
            defaultValues={selectedEntry}
            clients={clients}
            subClients={subClients}
            onSubmit={handleFormSubmit}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default WorkEntries;
