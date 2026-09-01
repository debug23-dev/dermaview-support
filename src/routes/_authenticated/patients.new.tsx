import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/patients/new")({
  head: () => ({
    meta: [
      { title: "Register patient — DermaCare AI" },
      {
        name: "description",
        content: "Register a new patient with demographics and relevant skin and medical history.",
      },
      { property: "og:title", content: "Register patient — DermaCare AI" },
      { property: "og:description", content: "Add a patient to the DermaCare AI register." },
    ],
  }),
  component: NewPatientPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, { message: "Full name is required" }).max(120),
  patient_code: z
    .string()
    .trim()
    .min(3, { message: "Patient code must be at least 3 characters" })
    .max(40),
  age: z.coerce.number().int().min(0).max(120).nullable(),
  gender: z.string().max(20).nullable(),
  contact_number: z.string().trim().max(30).nullable(),
  district: z.string().trim().max(80).nullable(),
  address: z.string().trim().max(400).nullable(),
  previous_skin_disease: z.string().trim().max(1000).nullable(),
  medical_history: z.string().trim().max(2000).nullable(),
  current_medication: z.string().trim().max(1000).nullable(),
  allergies: z.string().trim().max(1000).nullable(),
});

const empty = {
  full_name: "",
  patient_code: "",
  age: "",
  gender: "",
  contact_number: "",
  district: "",
  address: "",
  previous_skin_disease: "",
  medical_history: "",
  current_medication: "",
  allergies: "",
};

function NewPatientPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof empty) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      age: form.age === "" ? null : form.age,
      gender: form.gender || null,
      contact_number: form.contact_number || null,
      district: form.district || null,
      address: form.address || null,
      previous_skin_disease: form.previous_skin_disease || null,
      medical_history: form.medical_history || null,
      current_medication: form.current_medication || null,
      allergies: form.allergies || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("patients")
      .insert({ ...parsed.data, created_by: auth.user?.id ?? null })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate") ? "That patient code already exists." : error.message,
      );
      return;
    }
    await qc.invalidateQueries({ queryKey: ["patients"] });
    toast.success("Patient registered");
    await router.navigate({ to: "/patients/$id", params: { id: data.id } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Register patient</h1>
        <p className="text-sm text-muted-foreground">
          Only collect what the clinic needs for screening and follow-up.
        </p>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient details</CardTitle>
            <CardDescription>Name and patient code are required.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                maxLength={120}
                onChange={(e) => set("full_name")(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient_code">Patient code</Label>
              <Input
                id="patient_code"
                value={form.patient_code}
                maxLength={40}
                onChange={(e) => set("patient_code")(e.target.value)}
                placeholder="DC-0007"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => set("age")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select value={form.gender} onValueChange={set("gender")}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Undisclosed">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_number">Contact number</Label>
              <Input
                id="contact_number"
                value={form.contact_number}
                maxLength={30}
                onChange={(e) => set("contact_number")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={form.district}
                maxLength={80}
                onChange={(e) => set("district")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                maxLength={400}
                rows={2}
                onChange={(e) => set("address")(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical background</CardTitle>
            <CardDescription>
              Used by the future text model as structured clinical context.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="previous_skin_disease">Previous skin disease</Label>
              <Textarea
                id="previous_skin_disease"
                value={form.previous_skin_disease}
                maxLength={1000}
                rows={3}
                onChange={(e) => set("previous_skin_disease")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="medical_history">Medical history</Label>
              <Textarea
                id="medical_history"
                value={form.medical_history}
                maxLength={2000}
                rows={3}
                onChange={(e) => set("medical_history")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current_medication">Current medication</Label>
              <Textarea
                id="current_medication"
                value={form.current_medication}
                maxLength={1000}
                rows={3}
                onChange={(e) => set("current_medication")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={form.allergies}
                maxLength={1000}
                rows={3}
                onChange={(e) => set("allergies")(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save patient"}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to="/patients">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
