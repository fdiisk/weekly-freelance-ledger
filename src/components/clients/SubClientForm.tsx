
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Client, SubClient } from "@/types";
import SubClientPasteForm from "./SubClientPasteForm";

const formSchema = z.object({
  name: z.string().min(1, "Sub-client name is required"),
  clientId: z.string().min(1, "Parent client is required"),
});

type FormData = z.infer<typeof formSchema>;

interface SubClientFormProps {
  defaultValues?: SubClient;
  clients: Client[];
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  onMultipleSubmit?: (subClients: Omit<SubClient, "id">[]) => void;
}

const SubClientForm: React.FC<SubClientFormProps> = ({
  defaultValues,
  clients,
  onSubmit,
  onCancel,
  onMultipleSubmit,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      clientId: "",
    },
  });

  const handleMultipleSubmit = (subClients: Omit<SubClient, "id">[]) => {
    if (onMultipleSubmit) {
      onMultipleSubmit(subClients);
    }
  };

  return (
    <Tabs defaultValue="single">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="single">Single Entry</TabsTrigger>
        <TabsTrigger value="paste">Quick Paste</TabsTrigger>
      </TabsList>
      
      <TabsContent value="single">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Client</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter sub-client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="paste">
        <SubClientPasteForm 
          clients={clients}
          onSubmit={handleMultipleSubmit}
          onCancel={onCancel}
        />
      </TabsContent>
    </Tabs>
  );
};

export default SubClientForm;
