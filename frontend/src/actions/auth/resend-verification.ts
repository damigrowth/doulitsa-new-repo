'use server';

import { z } from 'zod';

import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { ActionResponse } from '@/lib/types/api';
import { getFormString } from '@/lib/utils/form';

// OLD actions/auth/resend-verification.ts — same validation and copy.
const resendSchema = z.object({
  email: z.string().email('Μη έγκυρη διεύθυνση email'),
});

const SENT_MESSAGE =
  'Το email επιβεβαίωσης στάλθηκε! Έλεγξε τα εισερχόμενά σου και τον φάκελο spam.';
// OLD: for security every non-rate-limit failure is reported as success
// (never reveal whether the email exists or is already verified).
const SILENT_MESSAGE =
  'Αν το email υπάρχει στο σύστημά μας, θα λάβεις ένα νέο email επιβεβαίωσης.';

export async function resendVerificationEmail(
  prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const email = getFormString(formData, 'email');
  const validated = resendSchema.safeParse({ email });
  if (!validated.success) {
    return {
      success: false,
      message: 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email',
    };
  }
  try {
    const res = (await authApi.resendVerification(validated.data.email)) as {
      message?: string;
      error?: unknown;
    } | null;
    // Django may answer HTTP 200 with an `{error:{code:'ok_silent',…}}`
    // envelope (unknown email). Treat it like OLD's swallowed failure.
    if (!res || res.error) {
      return { success: true, message: SILENT_MESSAGE };
    }
    return { success: true, message: SENT_MESSAGE };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      return {
        success: false,
        message: 'Πάρα πολλές προσπάθειες. Παρακαλώ δοκίμασε ξανά σε λίγα λεπτά.',
      };
    }
    return { success: true, message: SILENT_MESSAGE };
  }
}
