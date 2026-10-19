import Workspace from '../../components/Workspace';
import { notFound } from 'next/navigation';
export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!['developer', 'admin', 'staff'].includes(role)) notFound();
  return <Workspace role={role}/>;
}
