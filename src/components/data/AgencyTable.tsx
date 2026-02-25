"use client";

interface Agency {
  ori: string;
  agency_name: string;
  county_name: string;
  agency_type: string;
  nibrs: number;
}

interface Props {
  agencies: Agency[];
}

export default function AgencyTable({ agencies }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Agency</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">County</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">NIBRS</th>
          </tr>
        </thead>
        <tbody>
          {agencies.slice(0, 50).map((a) => (
            <tr key={a.ori} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{a.agency_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{a.county_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{a.agency_type}</td>
              <td className="px-3 py-2">
                <span className={`inline-block h-2 w-2 rounded-full ${a.nibrs ? "bg-green-400" : "bg-muted-foreground"}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {agencies.length > 50 && (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          Showing 50 of {agencies.length} agencies
        </p>
      )}
    </div>
  );
}
