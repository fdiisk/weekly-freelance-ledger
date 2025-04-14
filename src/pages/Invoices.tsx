
import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { FileTextIcon, CalendarIcon, EyeIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import PageLayout from "@/components/layout/PageLayout";
import InvoiceDetails from "@/components/invoices/InvoiceDetails";
import { useApp } from "@/context/AppContext";
import { Invoice } from "@/types";
import { formatCurrency } from "@/lib/utils";

const Invoices: React.FC = () => {
  const { invoices, clients, subClients, generateWeeklyInvoice } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailDialogOpen(true);
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <PageLayout
      title="Invoices"
      actions={
        <Button onClick={generateWeeklyInvoice}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Generate Weekly Invoice
        </Button>
      }
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No invoices found. Click "Generate Weekly Invoice" to create your first invoice.
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <FileTextIcon size={16} className="mr-2" />
                      {invoice.invoiceNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {format(new Date(invoice.startDate), "MMM dd")} -{" "}
                      {format(new Date(invoice.endDate), "MMM dd, yyyy")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <EyeIcon size={16} className="mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice && `Invoice ${selectedInvoice.invoiceNumber}`}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceDetails
              invoice={selectedInvoice}
              clients={clients}
              subClients={subClients}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Invoices;
