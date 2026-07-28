interface NotificationsProps {
  children: React.ReactNode;
}

/**
 * Server component that fetches notification data for a freelancer
 * and passes it to the client-side NotificationsProvider
 */
export default async function Notifications({ children }: NotificationsProps) {
  return <div>{children}</div>;
}
