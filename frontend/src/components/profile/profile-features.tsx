import React from 'react';
import { MessageCircle, CreditCard, Shield, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import IconBox from '@/components/shared/icon-box';

type ProfileFeaturesProps = {
  budget?: string | null;
  size?: string | null;
  contactMethods?: string[];
  paymentMethods?: string[];
  settlementMethods?: string[];
};

const iconMap = {
  contact: MessageCircle,
  payment: CreditCard,
  settlement: Shield,
  size: Users,
  budget: Wallet,
};

export default function ProfileFeatures({
  budget,
  size,
  contactMethods = [],
  paymentMethods = [],
  settlementMethods = [],
}: ProfileFeaturesProps) {
  const features = [
    {
      id: 'contact',
      title: 'Επικοινωνία',
      Icon: iconMap.contact,
      items: contactMethods,
      visible: contactMethods.length > 0,
    },
    {
      id: 'payment',
      title: 'Τρόποι Πληρωμής',
      Icon: iconMap.payment,
      items: paymentMethods,
      visible: paymentMethods.length > 0,
    },
    {
      id: 'settlement',
      title: 'Μέθοδος Εξόφλησης',
      Icon: iconMap.settlement,
      items: settlementMethods,
      visible: settlementMethods.length > 0,
    },
    {
      id: 'size',
      title: 'Αριθμός Εργαζομένων',
      Icon: iconMap.size,
      items: size ? [size] : [],
      visible: !!size,
    },
    {
      id: 'budget',
      title: 'Ελάχιστο Budget',
      Icon: iconMap.budget,
      items: budget ? [budget] : [],
      visible: !!budget,
    },
  ];

  const visibleFeatures = features.filter((f) => f.visible);

  if (visibleFeatures.length === 0) {
    return null;
  }

  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 py-5'>
      {visibleFeatures.map((feature) => (
        <div key={feature.id} className='group'>
          <IconBox
            icon={<feature.Icon className='h-10 w-10' />}
            iconVariant='brand'
            title={feature.title}
            titleClassName='mb-3'
            value={
              <div className='flex flex-wrap gap-1.5'>
                {feature.items.map((item, index) => (
                  <Badge
                    key={index}
                    variant='outline'
                    className='inline-block text-2sm font-medium py-1 px-2.5 text-center bg-muted text-muted-foreground border-none rounded-full'
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            }
          />
        </div>
      ))}
    </section>
  );
}
