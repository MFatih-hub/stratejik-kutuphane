import { redirect } from 'next/navigation';

// Eski adres: "Bugün" ekranının yeni adı Dem (/admin/dem).
export default function BugunRedirect() {
  redirect('/admin/dem');
}
