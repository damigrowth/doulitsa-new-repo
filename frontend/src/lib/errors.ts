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

  // Strapi-specific errors
  'Content Manager error': 'Σφάλμα διαχείρισης περιεχομένου',
  'Plugin error': 'Σφάλμα πρόσθετου',
  'Configuration error': 'Σφάλμα διαμόρφωσης',
  'Middleware error': 'Σφάλμα middleware',

  // GraphQL errors
  'GraphQL validation error': 'Σφάλμα επικύρωσης GraphQL',
  'Field not found': 'Το πεδίο δεν βρέθηκε',
  'Invalid query': 'Μη έγκυρο ερώτημα',
  'Variable not defined': 'Η μεταβλητή δεν ορίζεται',

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

  static fromPrismaError(error: any): AppError {
    let message: string = 'Database Error';
    let statusCode: number = 500;
    let type: string = 'DatabaseError';
    let details: ErrorDetails | null = { originalError: error.message };

    // Check if the error is a PrismaClientKnownRequestError
    if (error.code && typeof error.code === 'string') {
      switch (error.code) {
        case 'P2002':
          message = 'Duplicate entry';
          statusCode = 409;
          type = 'ConflictError';
          details = { target: error.meta?.target };
          break;
        case 'P2025':
          message = 'Record not found';
          statusCode = 404;
          type = 'NotFoundError';
          details = { cause: error.meta?.cause };
          break;
        case 'P2003':
          message = 'Foreign key constraint failed';
          statusCode = 400;
          type = 'BadRequestError';
          details = { field_name: error.meta?.field_name };
          break;
        case 'P2000':
          message = 'Value too long for column';
          statusCode = 400;
          type = 'BadRequestError';
          details = { column: error.meta?.column };
          break;
        case 'P2001':
          message = 'Record does not exist';
          statusCode = 404;
          type = 'NotFoundError';
          details = {
            model_name: error.meta?.model_name,
            where: error.meta?.where,
          };
          break;
        case 'P2004':
          message = 'Operation failed at the database level';
          statusCode = 500;
          type = 'DatabaseError';
          details = { database_error: error.meta?.database_error };
          break;
        case 'P2005':
          message = 'Invalid data for column';
          statusCode = 400;
          type = 'BadRequestError';
          details = { column: error.meta?.column, value: error.meta?.value };
          break;
        case 'P2006':
          message = 'Invalid data type';
          statusCode = 400;
          type = 'BadRequestError';
          details = {
            expected_type: error.meta?.expected_type,
            received_type: error.meta?.received_type,
          };
          break;
        case 'P2007':
          message = 'Validation error';
          statusCode = 400;
          type = 'ValidationError';
          details = { validation_error: error.meta?.validation_error };
          break;
        case 'P2008':
          message = 'Failed to parse query';
          statusCode = 400;
          type = 'BadRequestError';
          details = { query_parsing_error: error.meta?.query_parsing_error };
          break;
        case 'P2009':
          message = 'Failed to validate query';
          statusCode = 400;
          type = 'BadRequestError';
          details = {
            query_validation_error: error.meta?.query_validation_error,
          };
          break;
        case 'P2010':
          message = 'Raw query failed';
          statusCode = 500;
          type = 'DatabaseError';
          details = { query_error: error.meta?.query_error };
          break;
        case 'P2011':
          message = 'Null constraint violation';
          statusCode = 400;
          type = 'BadRequestError';
          details = { constraint: error.meta?.constraint };
          break;
        case 'P2012':
          message = 'Missing required value';
          statusCode = 400;
          type = 'BadRequestError';
          details = { value: error.meta?.value };
          break;
        case 'P2013':
          message = 'Missing required argument';
          statusCode = 400;
          type = 'BadRequestError';
          details = { argument_name: error.meta?.argument_name };
          break;
        case 'P2014':
          message =
            'The change you are trying to make requires a record that does not exist';
          statusCode = 404;
          type = 'NotFoundError';
          details = { relation_name: error.meta?.relation_name };
          break;
        case 'P2015':
          message = 'A related record could not be found';
          statusCode = 404;
          type = 'NotFoundError';
          details = { model_name: error.meta?.model_name };
          break;
        case 'P2016':
          message = 'Query interpretation error';
          statusCode = 500;
          type = 'DatabaseError';
          details = {
            query_interpretation_error: error.meta?.query_interpretation_error,
          };
          break;
        case 'P2017':
          message = 'The records for relation are not connected';
          statusCode = 400;
          type = 'BadRequestError';
          details = { relation_name: error.meta?.relation_name };
          break;
        case 'P2018':
          message = 'The required connected records were not found';
          statusCode = 404;
          type = 'NotFoundError';
          details = { relation_name: error.meta?.relation_name };
          break;
        case 'P2019':
          message = 'Input error';
          statusCode = 400;
          type = 'BadRequestError';
          details = { input_error: error.meta?.input_error };
          break;
        case 'P2020':
          message = 'Value out of range';
          statusCode = 400;
          type = 'BadRequestError';
          details = { value: error.meta?.value, range: error.meta?.range };
          break;
        case 'P2021':
          message = 'Table does not exist';
          statusCode = 500;
          type = 'DatabaseError';
          details = { table: error.meta?.table };
          break;
        case 'P2022':
          message = 'Column does not exist';
          statusCode = 500;
          type = 'DatabaseError';
          details = { column: error.meta?.column };
          break;
        case 'P2023':
          message = 'Invalid input for a Prisma command';
          statusCode = 400;
          type = 'BadRequestError';
          details = { command: error.meta?.command };
          break;
        case 'P2024':
          message =
            'Timed out fetching a new connection from the connection pool';
          statusCode = 503;
          type = 'ServiceUnavailableError';
          break;
        case 'P2026':
          message = 'The current database provider does not support a feature';
          statusCode = 500;
          type = 'DatabaseError';
          details = { feature: error.meta?.feature };
          break;
        case 'P2027':
          message = 'Multiple errors occurred on the database query';
          statusCode = 500;
          type = 'DatabaseError';
          details = { errors: error.meta?.errors };
          break;
        case 'P2028':
          message = 'Transaction API error';
          statusCode = 500;
          type = 'DatabaseError';
          details = { error: error.meta?.error };
          break;
        case 'P2029':
          message = 'Query parameter limit exceeded';
          statusCode = 400;
          type = 'BadRequestError';
          break;
        case 'P2030':
          message = 'Cannot find a fulltext index to use for the search';
          statusCode = 400;
          type = 'BadRequestError';
          details = {
            model_name: error.meta?.model_name,
            index_name: error.meta?.index_name,
          };
          break;
        case 'P2031':
          message =
            'Prisma needs to perform transactions, but the database does not support it';
          statusCode = 500;
          type = 'DatabaseError';
          break;
        case 'P2032':
          message = 'A foreign key constraint failed on the database';
          statusCode = 400;
          type = 'BadRequestError';
          details = { database_error: error.meta?.database_error };
          break;
        case 'P2033':
          message = 'A number used in the query is too large';
          statusCode = 400;
          type = 'BadRequestError';
          details = { value: error.meta?.value };
          break;
        case 'P2034':
          message = 'Transaction failed due to a write conflict or a deadlock';
          statusCode = 409;
          type = 'ConflictError';
          break;
        default:
          message = 'An unexpected Prisma error occurred';
          statusCode = 500;
          type = 'InternalServerError';
          break;
      }
    } else if (error.name === 'PrismaClientKnownRequestError') {
      // Generic Prisma Client Known Request Error
      message = 'A database request failed';
      statusCode = 400;
      type = 'DatabaseRequestError';
    } else if (error.name === 'PrismaClientUnknownRequestError') {
      message = 'An unknown database request error occurred';
      statusCode = 500;
      type = 'UnknownDatabaseRequestError';
    } else if (error.name === 'PrismaClientRustPanicError') {
      message = 'Prisma engine panicked';
      statusCode = 500;
      type = 'PrismaEnginePanicError';
    } else if (error.name === 'PrismaClientInitializationError') {
      message = 'Prisma client failed to initialize';
      statusCode = 500;
      type = 'PrismaInitializationError';
    } else if (error.name === 'PrismaClientValidationError') {
      message = 'Prisma validation error';
      statusCode = 400;
      type = 'PrismaValidationError';
    }

    return new AppError(AppError.translate(message), statusCode, type, details);
  }
}
