
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import WeeklyStats from "@/components/dashboard/WeeklyStats";
import SubClientSummary from "@/components/dashboard/SubClientSummary";
import { useApp } from "@/context/AppContext";
import { calculateSubClientSummaries } from "@/lib/utils";

const Dashboard: React.FC = () => {
  const { workEntries, clients, subClients, generateWeeklyInvoice } = useApp();
  const summaries = calculateSubClientSummaries(workEntries, clients, subClients);
  
  return (
    <PageLayout 
      title="Dashboard" 
      actions={
        <Button onClick={generateWeeklyInvoice}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Generate Weekly Invoice
        </Button>
      }
    >
      <div className="space-y-6">
        <WeeklyStats workEntries={workEntries} />
        <SubClientSummary summaries={summaries} />
      </div>
    </PageLayout>
  );
};

export default Dashboard;
