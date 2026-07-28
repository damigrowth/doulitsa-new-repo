import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες')
    .max(50, 'Το όνομα δεν μπορεί να υπερβαίνει τους 50 χαρακτήρες'),
  email: z
    .string()
    .email('Παρακαλώ εισάγετε ένα έγκυρο email'),
  message: z
    .string()
    .min(10, 'Το μήνυμα πρέπει να έχει τουλάχιστον 10 χαρακτήρες')
    .max(500, 'Το μήνυμα δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;