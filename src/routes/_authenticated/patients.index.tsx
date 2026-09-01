import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatients } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — DermaCare AI" },
      {
        name: "description",
        content: "Search, review and manage registered patients and their skin screening history.",
      },
      { property: "og:title", content: "Patients — DermaCare AI" },
      { property: "og:description", content: "Patient register for skin screening cases." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [search, setSearch] = useState("");
  const patients = useQuery({
    queryKey: ["patients", search],
    queryFn: () => listPatients(search),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-muted-foreground">
            {patients.data?.length ?? 0} record(s) in the register.
          </p>
        </div>
        <Button asChild>
          <Link to="/patients/new">Add patient</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient register</CardTitle>
          <CardDescription>Search by name, patient code, district or contact number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              maxLength={80}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients"
              className="pl-9"
              aria-label="Search patients"
            />
          </div>

          {patients.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading patients…</p>
          ) : (patients.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No patients found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Code</th>
                    <th className="py-2 pr-4 font-semibold">Name</th>
                    <th className="py-2 pr-4 font-semibold">Age</th>
                    <th className="py-2 pr-4 font-semibold">Gender</th>
                    <th className="py-2 pr-4 font-semibold">District</th>
                    <th className="py-2 pr-4 font-semibold">Contact</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {patients.data!.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs">{p.patient_code}</td>
                      <td className="py-2.5 pr-4 font-medium">{p.full_name}</td>
                      <td className="py-2.5 pr-4">{p.age ?? "—"}</td>
                      <td className="py-2.5 pr-4">{p.gender ?? "—"}</td>
                      <td className="py-2.5 pr-4">{p.district ?? "—"}</td>
                      <td className="py-2.5 pr-4">{p.contact_number ?? "—"}</td>
                      <td className="py-2.5 text-right">
                        <Link
                          to="/patients/$id"
                          params={{ id: p.id }}
                          className="font-semibold text-primary hover:underline"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
