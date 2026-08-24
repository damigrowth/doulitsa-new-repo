// src/lib/errors.ts

interface ErrorDetails {
  [key: string]: any;
}

const translations: { [key: string]: string } = {
  // Authentication errors
  'Invalid identifier or password': 'Λάθος email ή κωδικός',
  'Email or Username are already taken':
    'Το email ή το Username χρησιμοποιούνται ήδη',
  'An error occurred during account creation':
    'Προέκυψε σφάλμα κατά τη δημιουργία λογαριασμού',
  'Email is not confirmed': 'Το email δεν έχει επιβεβαιωθεί',
  'Your account has been disabled': 'Ο λογαριασμός σας έχει απενεργοποιηθεί',
  'A user with this email has already registered':
    'Ένας χρήστης με αυτό το email έχει ήδη εγγραφεί',
  'Invalid code provided': 'Μη έγκυρος κωδικός',
  'This email is already taken': 'Αυτό το email χρησιμοποιείται ήδη',
  'Username already taken': 'Το Username χρησιμοποιείται ήδη',

  // Password errors
  'Password confirmation does not match password':
    'Η επιβεβαίωση κωδικού δεν ταιριάζει',
  "Passwords don't match": 'Οι κωδικοί δεν ταιριάζουν',
  'Current password is incorrect': 'Ο τρέχων κωδικός είναι λανθασμένος',
  'Password must be at least 6 characters':
    'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες',
  'Password too weak': 'Ο κωδικός είναι πολύ αδύναμος',
  'New password must be different from current password':
    'Ο νέος κωδικός πρέπει να διαφέρει από τον τρέχοντα',

  // Token errors
  'Invalid token': 'Μη έγκυρος σύνδεσμος',
  'Token has expired': 'Ο σύνδεσμος έχει λήξει',
  'Invalid reset token': 'Μη έγκυρος σύνδεσμος επαναφοράς',
  'Reset token has expired': 'Ο σύνδεσμος επαναφοράς έχει λήξει',
  'Token already used': 'Ο σύνδεσμος έχει ήδη χρησιμοποιηθεί',
  'Invalid confirmation token': 'Μη έγκυρος σύνδεσμος επιβεβαίωσης',
  'Confirmation token has expired': 'Ο σύνδεσμος επιβεβαίωσης έχει λήξει',

  // Permission & Authorization errors
  Forbidden: 'Δεν έχετε δικαίωμα πρόσβασης',
  Unauthorized: 'Δεν είστε εξουσιοδοτημένος',
  'Access denied': 'Η πρόσβαση απορρίφθηκε',
  'You are not allowed to perform this action':
    'Δεν επιτρέπεται να εκτελέσετε αυτή την ενέργεια',
  'Insufficient permissions': 'Ανεπαρκή δικαιώματα',
  'Action not allowed': 'Η ενέργεια δεν επιτρέπεται',

  // Validation errors
  'This field is required': 'Αυτό το πεδίο είναι υποχρεωτικό',
  'This field must be unique': 'Αυτό το πεδίο πρέπει να είναι μοναδικό',
  'Invalid email format': 'Μη έγκυρη μορφή email',
  'Email must be a valid email': 'Το email πρέπει να είναι έγκυρο',
  'This value is already taken': 'Αυτή η τιμή χρησιμοποιείται ήδη',
  'Field must be a number': 'Το πεδίο πρέπει να είναι αριθμός',
  'Field must be a string': 'Το πεδίο πρέπει να είναι κείμενο',
  'Value is too short': 'Η τιμή είναι πολύ μικρή',
  'Value is too long': 'Η τιμή είναι πολύ μεγάλη',
  'Invalid date format': 'Μη έγκυρη μορφή ημερομηνίας',
  'Invalid phone number': 'Μη έγκυρος αριθμός τηλεφώνου',

  // File upload errors
  'File too large': 'Το αρχείο είναι πολύ μεγάλο',
  'Invalid file type': 'Μη έγκυρος τύπος αρχείου',
  'File upload failed': 'Η μεταφόρτωση αρχείου απέτυχε',
  'No file provided': 'Δεν παρέχεται αρχείο',
  'Invalid file format': 'Μη έγκυρη μορφή αρχείου',
  'File size exceeds limit': 'Το μέγεθος αρχείου υπερβαίνει το όριο',

  // Database errors
  'Record not found': 'Η εγγραφή δεν βρέθηκε',
  'Duplicate entry': 'Διπλότυπη εγγραφή',
  'Foreign key constraint': 'Περιορισμός ξένου κλειδιού',
  'Database connection error': 'Σφάλμα σύνδεσης βάσης δεδομένων',
  'Relation does not exist': 'Η σχέση δεν υπάρχει',

  // Rate limiting errors
  'Too many requests': 'Πάρα πολλές προσπάθειες. Παρακαλώ δοκιμάστε ξανά αργότερα.',
  'Rate limit exceeded': 'Υπέρβαση ορίου αιτήσεων',
  'Please try again later': 'Παρακαλώ δοκιμάστε ξανά αργότερα',

  // Server errors
  'Internal server error': 'Εσωτερικό σφάλμα διακομιστή',
  'Service unavailable': 'Η υπηρεσία δεν είναι διαθέσιμη',
  'Gateway timeout': 'Timeout πύλης',
  'Bad gateway': 'Κακή πύλη',
  'Network error': 'Σφάλμα δικτύου',

  // Custom business logic errors (common patterns)
  'Account not verified': 'Ο λογαριασμός δεν έχει επιβεβαιωθεί',
  'Account suspended': 'Ο λογαριασμός έχει ανασταλεί',
  'Profile incomplete': 'Το προφίλ είναι ημιτελές',
  'Action not permitted': 'Η ενέργεια δεν επιτρέπεται',
  'Resource not available': 'Ο πόρος δεν είναι διαθέσιμος',
  'Operation failed': 'Η λειτουργία απέτυχε',
  'Invalid request': 'Μη έγκυρη αίτηση',
  'Missing required parameter': 'Λείπει απαιτούμενη παράμετρος',

  // Email-related errors
  'Email already confirmed': 'Το email έχει ήδη επιβεβαιωθεί',
  'Your account email is not confirmed':
    'Το email του λογαριασμου δεν έχει επιβεβαιωθεί',
  'Email not found': 'Το email δεν βρέθηκε',
  'Invalid email address': 'Μη έγκυρη διεύθυνση email',
  'Email sending failed': 'Η αποστολή email απέτυχε',
  'SMTP error': 'Σφάλμα SMTP',
  
  // Better Auth specific errors
  'EMAIL_NOT_VERIFIED': 'Το email δεν έχει επιβεβαιωθεί. Παρακαλώ ελέγξτε το email σας για το σύνδεσμο επιβεβαίωσης.',
  'Email not verified': 'Το email δεν έχει επιβεβαιωθεί. Παρακαλώ ελέγξτε το email σας για το σύνδεσμο επιβεβαίωσης.',
  'INVALID_EMAIL_OR_PASSWORD': 'Λάθος email ή κωδικός',
  'Invalid email or password': 'Λάθος email ή κωδικός',
  'ACCOUNT_NOT_FOUND': 'Δεν βρέθηκε λογαριασμός με αυτό το email',
  'Account not found': 'Δεν βρέθηκε λογαριασμός με αυτό το email',
  'USER_NOT_FOUND': 'Δεν βρέθηκε χρήστης',
  'User not found': 'Δεν βρέθηκε χρήστης',
  'INVALID_PASSWORD': 'Λάθος κωδικός',
  'Invalid password': 'Λάθος κωδικός',
  'TOO_MANY_REQUESTS': 'Πάρα πολλές προσπάθειες. Παρακαλώ δοκιμάστε ξανά αργότερα.',

  // Generic fallbacks for untranslated errors
  'Something went wrong': 'Κάτι πήγε στραβά',
  'An error occurred': 'Προέκυψε σφάλμα',
  'Please try again': 'Παρακαλώ δοκιμάστε ξανά',
  'Request failed': 'Η αίτηση απέτυχε',
  'Unknown error': 'Άγνωστο σφάλμα',

  // Additional Greek-specific error patterns you might encounter
  'Validation failed': 'Η επικύρωση απέτυχε',
  'Invalid input': 'Μη έγκυρη εισαγωγή',
  'Connection timeout': 'Timeout σύνδεσης',
  'Server not responding': 'Ο διακομιστής δεν ανταποκρίνεται',
  'Request timeout': 'Timeout αιτήματος',
};

export class AppError extends Error {
  public statusCode: number;
  public type: string;
  public details: ErrorDetails | null;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'AppError',
    details: ErrorDetails | null = null,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    // This line is important for maintaining proper stack traces in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toResponse() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        type: this.type,
        details: this.details,
      },
    };
  }

  static translate(message: string): string {
    return translations[message] || message;
  }

  static badRequest(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      400,
      'BadRequestError',
      details,
    );
  }

  static unauthorized(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      401,
      'UnauthorizedError',
      details,
    );
  }

  static forbidden(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      403,
      'ForbiddenError',
      details,
    );
  }

  static notFound(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      404,
      'NotFoundError',
      details,
    );
  }

  static conflict(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      409,
      'ConflictError',
      details,
    );
  }

  static tooManyRequests(
    message: string,
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      429,
      'TooManyRequestsError',
      details,
    );
  }

  static internal(
    message: string = 'Internal Server Error',
    details: ErrorDetails | null = null,
  ): AppError {
    return new AppError(
      AppError.translate(message),
      500,
      'InternalServerError',
      details,
    );
  }
}
