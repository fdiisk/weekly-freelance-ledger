
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubClientSummary as SubClientSummaryType } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SubClientSummaryProps {
  summaries: SubClientSummaryType[];
}

const SubClientSummary: React.FC<SubClientSummaryProps> = ({ summaries }) => {
  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sub-Client Work Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No work entries found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sub-Client Work Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Sub-Client</th>
                <th className="p-2 text-left font-medium">Client</th>
                <th className="p-2 text-left font-medium">Total Hours</th>
                <th className="p-2 text-left font-medium">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.subClientId} className="border-b">
                  <td className="p-2">{summary.subClientName}</td>
                  <td className="p-2">{summary.clientName}</td>
                  <td className="p-2">{summary.totalHours.toFixed(2)}</td>
                  <td className="p-2">{formatCurrency(summary.totalBill)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubClientSummary;
