import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge, StatusBadge, type CaseStatus } from "@/components/StatusBadges";
import { Disclaimer } from "@/components/Disclaimer";
import { getPatient, listCasesForPatient } from "@/lib/data";
import type { RiskLevel } from "@/lib/prediction/risk";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient profile — DermaCare AI" },
      {
        name: "description",
        content: "Patient demographics, medical background and full skin screening history.",
      },
      { property: "og:title", content: "Patient profile — DermaCare AI" },
      { property: "og:description", content: "Patient record and screening history." },
    ],
  }),
  component: PatientProfilePage,
});

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}

function PatientProfilePage() {
  const { id } = Route.useParams();
  const patient = useQuery({ queryKey: ["patient", id], queryFn: () => getPatient(id) });
  const cases = useQuery({ queryKey: ["patient-cases", id], queryFn: () => listCasesForPatient(id) });

  if (patient.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading patient…</p>;
  }
  if (!patient.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Patient not found</h1>
        <Button asChild variant="outline">
          <Link to="/patients">Back to patients</Link>
        </Button>
      </div>
    );
  }

  const p = patient.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{p.patient_code}</p>
          <h1 className="text-2xl font-bold">{p.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {[p.age ? `${p.age} yrs` : null, p.gender, p.district].filter(Boolean).join(" · ") ||
              "No demographics recorded"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/patients">All patients</Link>
          </Button>
          <Button asChild>
            <Link to="/screening/new" search={{ patient: p.id }}>
              New screening
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record</CardTitle>
          <CardDescription>Demographics and medical background.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Contact" value={p.contact_number} />
            <Field label="District" value={p.district} />
            <Field label="Address" value={p.address} />
            <Field label="Previous skin disease" value={p.previous_skin_disease} />
            <Field label="Medical history" value={p.medical_history} />
            <Field label="Current medication" value={p.current_medication} />
            <Field label="Allergies" value={p.allergies} />
            <Field label="Registered" value={new Date(p.created_at).toLocaleString()} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screening history</CardTitle>
          <CardDescription>{cases.data?.length ?? 0} case(s) recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading cases…</p>
          ) : (cases.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No screening cases yet for this patient.
            </p>
          ) : (
            <ul className="space-y-3">
              {cases.data!.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {c.affected_area || "Unspecified area"}
                      {c.duration ? ` · ${c.duration}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={c.risk_level as RiskLevel | null} />
                    <StatusBadge status={c.status as CaseStatus} />
                    <Link
                      to="/screening/$id"
                      params={{ id: c.id }}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
