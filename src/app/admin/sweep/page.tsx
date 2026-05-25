import { redirect } from 'next/navigation';

export default function SweepRedirectPage() {
  redirect('/admin/handoff');
}
