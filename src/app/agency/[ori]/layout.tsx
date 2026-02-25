export async function generateMetadata({ params }: { params: { ori: string } }) {
  return {
    title: `Agency ${params.ori} — Crime Tracker`,
    description: `Crime data and demographics for agency ${params.ori}.`,
  };
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
