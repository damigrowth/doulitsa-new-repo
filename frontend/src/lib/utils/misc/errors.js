export const strapiErrorTranslations = {
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
  'Too many requests': 'Πάρα πολλές αιτήσεις',
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
