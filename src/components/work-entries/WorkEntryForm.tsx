
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, calculateBill } from "@/lib/utils";
import { Client, SubClient, WorkEntry } from "@/types";

const formSchema = z.object({
  date: z.date({ required_error: "Date is required" }),
  clientId: z.string().min(1, "Client is required"),
  subClientId: z.string().min(1, "Sub-client is required"),
  project: z.string().min(1, "Project name is required"),
  taskDescription: z.string().min(1, "Task description is required"),
  fileAttachments: z.array(z.string()).optional(),
  hours: z.coerce.number().min(0.01, "Hours must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  invoiced: z.boolean().default(false),
  paid: z.boolean().default(false),
});

type FormData = Omit<z.infer<typeof formSchema>, "bill">;

interface WorkEntryFormProps {
  defaultValues?: WorkEntry;
  clients: Client[];
  subClients: SubClient[];
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

const WorkEntryForm: React.FC<WorkEntryFormProps> = ({
  defaultValues,
  clients,
  subClients,
  onSubmit,
  onCancel,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    defaultValues?.clientId || ""
  );

  // Filter sub-clients based on selected client
  const filteredSubClients = subClients.filter(
    (sc) => sc.clientId === selectedClientId
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
      ? {
          ...defaultValues,
          fileAttachments: defaultValues.fileAttachments || [],
        }
      : {
          date: new Date(),
          clientId: "",
          subClientId: "",
          project: "",
          taskDescription: "",
          fileAttachments: [],
          hours: 0,
          rate: 0,
          invoiced: false,
          paid: false,
        },
  });

  // Update rate when client changes
  useEffect(() => {
    const clientId = form.watch("clientId");
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client && !defaultValues) {
        form.setValue("rate", client.rate);
      }
    }
  }, [form.watch("clientId"), clients, form, defaultValues]);

  // Calculate bill when hours or rate changes
  const hours = form.watch("hours");
  const rate = form.watch("rate");
  const bill = calculateBill(hours || 0, rate || 0);

  // Handle client change
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    form.setValue("subClientId", ""); // Clear sub-client when client changes

    // Set default rate from client
    const client = clients.find((c) => c.id === clientId);
    if (client && !defaultValues?.invoiced) {
      form.setValue("rate", client.rate);
    }
  };

  // Simulate file attachments (would need backend integration for real file uploads)
  const [attachments, setAttachments] = useState<string[]>(
    defaultValues?.fileAttachments || []
  );
  
  const handleAttachmentAdd = () => {
    const newFile = `File-${Math.floor(Math.random() * 10000)}.pdf`;
    const newAttachments = [...attachments, newFile];
    setAttachments(newAttachments);
    form.setValue("fileAttachments", newAttachments);
  };
  
  const handleAttachmentRemove = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    form.setValue("fileAttachments", newAttachments);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select
                  onValueChange={(value) => handleClientChange(value)}
                  defaultValue={field.value}
                  disabled={defaultValues?.invoiced}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} (${client.rate.toFixed(2)}/hr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subClientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-Client</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!selectedClientId || defaultValues?.invoiced}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sub-client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredSubClients.map((subClient) => (
                      <SelectItem key={subClient.id} value={subClient.id}>
                        {subClient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="project"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <FormControl>
                  <Input placeholder="Enter project name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="taskDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the work done"
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>File Attachments</FormLabel>
          <div className="space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-muted rounded-md px-2 py-1"
                  >
                    <span className="text-sm">{file}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={() => handleAttachmentRemove(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAttachmentAdd}
            >
              Attach File
            </Button>
          </div>
        </FormItem>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Hours worked"
                    disabled={defaultValues?.invoiced}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate ($/hr)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Hourly rate"
                    disabled={defaultValues?.invoiced}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Bill Amount</FormLabel>
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted/50">
              ${bill.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="invoiced"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer">Invoiced</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paid"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer">Paid</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Entry</Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkEntryForm;
