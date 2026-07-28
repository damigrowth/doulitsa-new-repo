import { redirect } from 'next/navigation';

export default async function EditProfilePage() {
  // Redirect all users to account page
  redirect('/dashboard/profile/account');
}
