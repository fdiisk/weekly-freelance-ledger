
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkEntry } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getLastWeekDateRange, getEntriesForDateRange } from "@/lib/utils";

interface WeeklyStatsProps {
  workEntries: WorkEntry[];
}

const WeeklyStats: React.FC<WeeklyStatsProps> = ({ workEntries }) => {
  const { startDate, endDate } = getLastWeekDateRange();
  const lastWeekEntries = getEntriesForDateRange(workEntries, startDate, endDate);
  
  const totalHours = lastWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalEarned = lastWeekEntries.reduce((sum, entry) => sum + entry.bill, 0);
  const invoicedEntries = lastWeekEntries.filter(entry => entry.invoiced);
  const invoicedAmount = invoicedEntries.reduce((sum, entry) => sum + entry.bill, 0);
  const uninvoicedAmount = totalEarned - invoicedAmount;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Week's Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Week's Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalEarned)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Week's Invoiced
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(invoicedAmount)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Week's Uninvoiced
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(uninvoicedAmount)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyStats;
