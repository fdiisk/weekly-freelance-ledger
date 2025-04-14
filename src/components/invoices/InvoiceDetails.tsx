
import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Invoice, Client, SubClient } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface InvoiceDetailsProps {
  invoice: Invoice;
  clients: Client[];
  subClients: SubClient[];
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  clients,
  subClients,
}) => {
  // Group entries by subClient
  const entriesBySubClient: Record<string, typeof invoice.entries> = {};
  
  invoice.entries.forEach((entry) => {
    if (!entriesBySubClient[entry.subClientId]) {
      entriesBySubClient[entry.subClientId] = [];
    }
    entriesBySubClient[entry.subClientId].push(entry);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <div>Invoice #{invoice.invoiceNumber}</div>
          <div>
            Created: {format(invoice.createdAt, "MMM dd, yyyy")}
          </div>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Period: {format(invoice.startDate, "MMM dd, yyyy")} - {format(invoice.endDate, "MMM dd, yyyy")}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(entriesBySubClient).map(([subClientId, entries]) => {
            const subClient = subClients.find((sc) => sc.id === subClientId);
            const client = clients.find(
              (c) => c.id === entries[0].clientId
            );
            
            const totalHours = entries.reduce(
              (sum, entry) => sum + entry.hours,
              0
            );
            const totalAmount = entries.reduce(
              (sum, entry) => sum + entry.bill,
              0
            );

            return (
              <div key={subClientId} className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">
                  {subClient?.name} ({client?.name})
                </h3>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Project</th>
                        <th className="p-2 text-left font-medium hidden md:table-cell">
                          Description
                        </th>
                        <th className="p-2 text-right font-medium">Hours</th>
                        <th className="p-2 text-right font-medium">Rate</th>
                        <th className="p-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="p-2">
                            {format(new Date(entry.date), "MMM dd, yyyy")}
                          </td>
                          <td className="p-2">{entry.project}</td>
                          <td className="p-2 hidden md:table-cell">
                            {entry.taskDescription}
                          </td>
                          <td className="p-2 text-right">
                            {entry.hours.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            ${entry.rate.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(entry.bill)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/20 font-medium">
                        <td colSpan={3} className="p-2 text-right">
                          Subtotal:
                        </td>
                        <td className="p-2 text-right">
                          {totalHours.toFixed(2)}
                        </td>
                        <td></td>
                        <td className="p-2 text-right">
                          {formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-4">
            <div className="w-64 border-t pt-2">
              <div className="flex justify-between py-1">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceDetails;
