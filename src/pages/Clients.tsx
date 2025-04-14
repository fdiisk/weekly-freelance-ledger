
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import PageLayout from "@/components/layout/PageLayout";
import ClientForm from "@/components/clients/ClientForm";
import SubClientForm from "@/components/clients/SubClientForm";
import CsvImporter from "@/components/clients/CsvImporter";
import { useApp } from "@/context/AppContext";
import { Client, SubClient } from "@/types";
import { formatCurrency } from "@/lib/utils";

const Clients: React.FC = () => {
  const {
    clients,
    subClients,
    addClient,
    updateClient,
    deleteClient,
    addSubClient,
    updateSubClient,
    deleteSubClient,
  } = useApp();

  const [activeTab, setActiveTab] = useState("clients");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isSubClientDialogOpen, setIsSubClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [selectedSubClient, setSelectedSubClient] = useState<SubClient | undefined>(undefined);

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsClientDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClient(client.id);
    }
  };

  const handleClientFormSubmit = (data: Omit<Client, "id">) => {
    if (selectedClient) {
      updateClient({ ...selectedClient, ...data });
      toast.success(`Client "${data.name}" updated`);
    } else {
      addClient(data);
      toast.success(`Client "${data.name}" added`);
    }
    setIsClientDialogOpen(false);
  };

  const handleAddSubClient = () => {
    setSelectedSubClient(undefined);
    setIsSubClientDialogOpen(true);
  };

  const handleEditSubClient = (subClient: SubClient) => {
    setSelectedSubClient(subClient);
    setIsSubClientDialogOpen(true);
  };

  const handleDeleteSubClient = (subClient: SubClient) => {
    if (confirm("Are you sure you want to delete this sub-client?")) {
      deleteSubClient(subClient.id);
    }
  };

  const handleSubClientFormSubmit = (data: Omit<SubClient, "id">) => {
    if (selectedSubClient) {
      updateSubClient({ ...selectedSubClient, ...data });
      toast.success("Sub-client updated");
    } else {
      addSubClient(data);
      toast.success("Sub-client added");
    }
    setIsSubClientDialogOpen(false);
  };

  const handleImportClients = (clientData: Omit<Client, "id">[]) => {
    clientData.forEach(client => {
      addClient(client);
    });
  };

  const handleImportSubClients = (subClientData: Omit<SubClient, "id">[]) => {
    subClientData.forEach(subClient => {
      addSubClient(subClient);
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  return (
    <PageLayout title="Client Management">
      <Tabs defaultValue="clients" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="subclients">Sub-Clients</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {activeTab === "clients" && (
              <>
                <CsvImporter 
                  type="clients" 
                  onImportClients={handleImportClients} 
                />
                <Button onClick={handleAddClient}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </>
            )}
            {activeTab === "subclients" && (
              <>
                <CsvImporter 
                  type="subclients" 
                  onImportSubClients={handleImportSubClients}
                  clients={clients}
                />
                <Button onClick={handleAddSubClient} disabled={clients.length === 0}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Sub-Client
                </Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="clients">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Default Rate ($/hr)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No clients found. Click "Add Client" to create your first client or import from CSV.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(client.rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditClient(client)}
                          >
                            <PencilIcon size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClient(client)}
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
        </TabsContent>

        <TabsContent value="subclients">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Client</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No sub-clients found. Click "Add Sub-Client" to create your first sub-client or import from CSV.
                    </TableCell>
                  </TableRow>
                ) : (
                  subClients.map((subClient) => (
                    <TableRow key={subClient.id}>
                      <TableCell className="font-medium">{subClient.name}</TableCell>
                      <TableCell>{getClientName(subClient.clientId)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditSubClient(subClient)}
                          >
                            <PencilIcon size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteSubClient(subClient)}
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
        </TabsContent>
      </Tabs>

      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            defaultValues={selectedClient}
            onSubmit={handleClientFormSubmit}
            onCancel={() => setIsClientDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isSubClientDialogOpen} onOpenChange={setIsSubClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubClient ? "Edit Sub-Client" : "Add Sub-Client"}
            </DialogTitle>
          </DialogHeader>
          <SubClientForm
            defaultValues={selectedSubClient}
            clients={clients}
            onSubmit={handleSubClientFormSubmit}
            onCancel={() => setIsSubClientDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Clients;
