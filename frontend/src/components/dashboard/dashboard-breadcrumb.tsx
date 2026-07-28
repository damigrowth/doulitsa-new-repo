'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

const routeLabels: Record<string, string> = {
  dashboard: 'Πίνακας Ελέγχου',
  messages: 'Μηνύματα',
  saved: 'Αποθηκευμένα',
  reviews: 'Αξιολογήσεις',
  orders: 'Παραγγελίες',
  services: 'Διαχείριση Υπηρεσιών',
  profile: 'Διαχείριση',
  documents: 'Παραστατικά',
  create: 'Δημιουργία Υπηρεσίας',
  edit: 'Επεξεργασία',
  account: 'Λογαριασμός',
  basic: 'Βασικά στοιχεία',
  coverage: 'Τρόποι Παροχής',
  additional: 'Πρόσθετα Στοιχεία',
  'contact-details': 'Επικοινωνία',
  verification: 'Πιστοποίηση',
  billing: 'Στοιχεία Τιμολόγησης',
  promote: 'Προώθηση',
  checkout: 'Ολοκλήρωση Πληρωμής',
  success: 'Επιτυχής Εγγραφή',
};

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items from path segments
  const breadcrumbItems = segments
    .map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const label =
        routeLabels[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      const isLast = index === segments.length - 1;

      return { path, label, isLast, segment };
    })
    // Filter out dynamic route segments (chat IDs, etc.) that aren't in routeLabels
    .filter((item, index, array) => {
      // Hide "edit" and service ID for /dashboard/services/edit/* pages
      const isServicesEditPath =
        segments[0] === 'dashboard' &&
        segments[1] === 'services' &&
        segments[2] === 'edit';
      if (isServicesEditPath) {
        // Hide "edit" segment
        if (item.segment === 'edit') return false;
        // Hide the ID segment (after "edit")
        if (index > 0 && array[index - 1]?.segment === 'edit') return false;
      }

      // Keep if it's in routeLabels
      if (routeLabels[item.segment]) return true;

      // Keep if it's the last segment (current page)
      if (item.isLast) {
        // But skip if the previous segment was "messages" (it's a chat ID)
        if (index > 0 && array[index - 1].segment === 'messages') {
          return false;
        }
        return true;
      }

      // Keep other segments
      return true;
    });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className='hidden md:block'>
          <BreadcrumbLink href='/'>Αρχική</BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbItems.map((item, index) => (
          <Fragment key={item.path}>
            <BreadcrumbSeparator className='hidden md:block' />
            <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.path}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
