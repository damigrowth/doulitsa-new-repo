"""Transactional email templates, ported VERBATIM from the OLD app.

Source: oldnext/src/constants/email/templates/*.ts (HTML + plain-text twins).
Placeholders use the OLD `${name}` spelling and are filled by `fill()`; every
OLD conditional / computed expression is pre-computed by the builders in
`apps.messaging.emails` and passed in as a plain value. `${BASE}` replaces the
OLD hard-coded `https://doulitsa.gr` so links follow FRONTEND_BASE_URL (which
itself defaults to https://doulitsa.gr, like OLD `NEXT_PUBLIC_APP_URL ||
'https://doulitsa.gr'`).

Do not "improve" these strings — the OLD app is the parity reference.
"""
from __future__ import annotations

import re

_PLACEHOLDER = re.compile(r"\$\{(\w+)\}")


def fill(template: str, **values) -> str:
    """Replace each `${key}` with str(values[key]) (None -> '')."""

    def _sub(m: "re.Match[str]") -> str:
        key = m.group(1)
        if key not in values:
            raise KeyError(f"email template placeholder not provided: {key}")
        v = values[key]
        return "" if v is None else str(v)

    return _PLACEHOLDER.sub(_sub, template)


VERIFICATION_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Επιβεβαίωση Λογαριασμού</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643; text-align: center;">
                   <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #122f5e;">Επιβεβαίωση Λογαριασμού</h1>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Καλώς ήρθες στην πλατφόρμα επαγγελματιών Doulitsa! Σε ευχαριστούμε που εγγράφηκες. Για να ενεργοποιήσεις τον λογαριασμό σου, πάτησε στον παρακάτω σύνδεσμο:
                      </p>
                  <a href="${url}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: 700;">Επιβεβαίωση Λογαριασμού</a>
                      <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 24px; font-family: Arial, sans-serif;">
                        Αν δεν πραγματοποίησες εσύ αυτή την εγγραφή, μπορείς να αγνοήσεις αυτό το μήνυμα. Αν έχεις οποιαδήποτε απορία, είμαστε στη διάθεσή σου!<br /><br />
                        Με εκτίμηση,<br />
                        Η ομάδα Doulitsa
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;"> &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

VERIFICATION_TEXT = """
ΕΠΑΛΗΘΕΥΣΗ ΛΟΓΑΡΙΑΣΜΟΥ

Καλώς ήρθες στην πλατφόρμα επαγγελματιών Doulitsa! Σε ευχαριστούμε που εγγράφηκες.

Για να ενεργοποιήσεις τον λογαριασμό σου, πάτησε στον παρακάτω σύνδεσμο:

${url}

Αν δεν πραγματοποίησες εσύ αυτή την εγγραφή, μπορείς να αγνοήσεις αυτό το μήνυμα. Αν έχεις οποιαδήποτε απορία, είμαστε στη διάθεσή σου!

Με εκτίμηση,
Η ομάδα Doulitsa

---
© Doulitsa, 2026
"""

PASSWORD_RESET_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Επαναφορά Κωδικού</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643; text-align: center;">
                      <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #109e79;">Επαναφορά Κωδικού</h1>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Γεια σου ${greetName},
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Λάβαμε αίτημα για επαναφορά του κωδικού σου. Κάνε κλικ στον παρακάτω σύνδεσμο για να δημιουργήσεις νέο κωδικό:
                      </p>
                      <a href="${url}" style="background: #109e79; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: 700;">
                        Επαναφορά Κωδικού
                      </a>
                      <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 24px; font-family: Arial, sans-serif;">
                        Αν δεν μπορείς να κάνεις κλικ στο κουμπί, αντίγραψε και επικόλλησε αυτό το link στον browser σου:
                      </p>
                      <p style="word-break: break-all; color: #6b7280; font-family: monospace; font-size: 12px; margin: 10px 0;">${url}</p>
                      <p style="color: #dc2626; margin: 20px 0 0 0; font-size: 14px;">
                        Αυτός ο σύνδεσμος θα λήξει σε 1 ώρα.
                      </p>
                      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        Αν δεν ζήτησες επαναφορά κωδικού, μπορείς να αγνοήσεις αυτό το email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

PASSWORD_RESET_TEXT = """
ΕΠΑΝΑΦΟΡΑ ΚΩΔΙΚΟΥ

Γεια σου ${greetName},

Λάβαμε αίτημα για επαναφορά του κωδικού σου. Κάνε κλικ στον παρακάτω σύνδεσμο για να δημιουργήσεις νέο κωδικό:

${url}

⚠️ Αυτός ο σύνδεσμος θα λήξει σε 1 ώρα.

---

Αν δεν ζήτησες επαναφορά κωδικού, μπορείς να αγνοήσεις αυτό το email.

---
© Doulitsa, 2026
"""

WELCOME_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Καλώς ήρθατε</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643; text-align: center;">
                      <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #122f5e;">Καλώς ήρθατε στη Doulitsa!</h1>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Γεια σας ${greetName},
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Ο λογαριασμός σας έχει επιβεβαιωθεί επιτυχώς! Μπορείτε τώρα να εκμεταλλευτείτε όλες τις δυνατότητες της πλατφόρμας μας.
                      </p>
                      ${roleParagraph}
                      <a href="${dashboardUrl}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: 700;">
                        Μετάβαση στο Dashboard
                      </a>
                      <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 24px; font-family: Arial, sans-serif;">
                        Αν έχετε οποιαδήποτε απορία, είμαστε στη διάθεσή σας!<br /><br />
                        Με εκτίμηση,<br />
                        Η ομάδα Doulitsa
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

WELCOME_TEXT = """
ΚΑΛΩΣ ΗΡΘΑΤΕ ΣΤΗ DOULITSA!

Γεια σας ${greetName},

Ο λογαριασμός σας έχει επιβεβαιωθεί επιτυχώς! Μπορείτε τώρα να εκμεταλλευτείτε όλες τις δυνατότητες της πλατφόρμας μας.

${roleParagraph}

Μετάβαση στο Dashboard:
${dashboardUrl}

Αν έχετε οποιαδήποτε απορία, είμαστε στη διάθεσή σας!

Με εκτίμηση,
Η ομάδα Doulitsa

---
© Doulitsa, 2026
"""

CONTACT_ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message in Your Inbox</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 0;">
                <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
                    <tr>
                        <td style="padding: 30px 30px 30px 30px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 0 0 0px 0; color: #153643;">
                                        <h1 style="font-size: 24px; text-align: center; margin: 0 0 10px 0; font-family: Arial, sans-serif; color: #122f5e;">Νέα Φόρμα Επικοινωνίας!</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table role="presentation" style="width: 100%; border-collapse: separate; border: 1px solid #cccccc; border-radius: 10px;">
                                <tr>
                                    <td style="padding: 20px; background-color: #f8f8f8;">
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 0 0 10px 0;">
                                                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #153643;">Όνομα: ${name}</p>
                                                </td>
                                            </tr>
                                           <tr>
                                                <td style="padding: 0 0 10px 0;">
                                                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #153643;">Email: ${email}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 0 10px 0;">
                                                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #153643;">Θέμα: ${subjectOrDefault}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0;">
                                                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #555555;">${message}</p>
                                                </td>
                                            </tr>
                                            ${contactIdBlock}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background: #000;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 0; width: 50%;" align="left">
                                        <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                                            &reg; Doulitsa, 2026<br/>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

CONTACT_CONFIRMATION_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Contacting Us</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 0;">
                <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
                    <tr>
                        <td style="padding: 36px 30px 42px 30px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="color: #153643; text-align: center;">
                                        <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #122f5e;">Λάβαμε το μήνυμα σου ${name}!</h1>
                                        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">Σε ευχαριστούμε που επικοινώνησες μαζί μας! </p>
                                        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">Η ομάδα μας θα δει το αίτημά σου και θα σου απαντήσει το συντομότερο.<br/> Συνήθως απαντάμε μέσα σε 24-48 ώρες.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background: #000;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 0; width: 50%;" align="left">
                                        <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                                            &reg; Doulitsa, 2026<br/>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

CONTACT_ADMIN_TEXT = """
ΝΕΑ ΦΟΡΜΑ ΕΠΙΚΟΙΝΩΝΙΑΣ!

Όνομα: ${name}
Email: ${email}
Θέμα: ${subjectOrDefault}

Μήνυμα:
${message}

${contactIdBlock}

---
© Doulitsa, 2026
"""

CONTACT_CONFIRMATION_TEXT = """
ΛΑΒΑΜΕ ΤΟ ΜΗΝΥΜΑ ΣΟΥ ${nameUpper}!

Σε ευχαριστούμε που επικοινώνησες μαζί μας!

Η ομάδα μας θα δει το αίτημά σου και θα σου απαντήσει το συντομότερο.
Συνήθως απαντάμε μέσα σε 24-48 ώρες.

---
© Doulitsa, 2026
"""

NEW_VERIFICATION_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέο Αίτημα Πιστοποίησης</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">
                      <h2 style="font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">${displayName}</h2>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Ο χρήστης <strong>${displayName}</strong> (${userEmail}) αιτείται πιστοποίηση του προφίλ του.
                      </p>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>📋 Ενέργειες:</strong>
                      </p>
                      <a href="${BASE}/admin/verifications/${verificationId}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px 10px 10px 0; font-weight: 700;">
                        Προβολή Πιστοποίησης
                      </a>
                      <a href="${BASE}/admin/profiles/${profileId}" style="background: #ffffff; color: #122f5e; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px; font-weight: 700; border: 2px solid #122f5e;">
                        Προβολή Προφίλ
                      </a>
                      <a href="${BASE}/admin/verifications" style="background: #ffffff; color: #122f5e; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px; font-weight: 700; border: 2px solid #122f5e;">
                        Διαχείριση Πιστοποιήσεων
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

NEW_VERIFICATION_TEXT = """
ΝΕΟ ΑΙΤΗΜΑ ΠΙΣΤΟΠΟΙΗΣΗΣ

${displayName}

Ο χρήστης ${displayName} (${userEmail}) αιτείται πιστοποίηση του προφίλ του.

---

📋 ΕΝΕΡΓΕΙΕΣ:

Προβολή Πιστοποίησης:
${BASE}/admin/verifications/${verificationId}

Προβολή Προφίλ:
${BASE}/admin/profiles/${profileId}

Διαχείριση Πιστοποιήσεων:
${BASE}/admin/verifications

---
© Doulitsa, 2026
"""

SERVICE_REPORT_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αναφορά Υπηρεσίας</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 10px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">
                    
                      <h1 style="font-size: 24px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">Αναφορά Υπηρεσίας</h1>

                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Περιγραφή Ζητήματος:</strong><br>
                        ${reportDetails}
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Αναφορά για την υπηρεσία:</strong><br>
                        <strong>ID:</strong> ${serviceId}<br>
                        <strong>Τίτλος:</strong> ${serviceTitle}<br>
                        <strong>Slug:</strong> ${serviceSlug}<br>
                        <a href="${serviceAdminUrl}" style="color: #122f5e; text-decoration: underline;">Προβολή Υπηρεσίας στο Admin</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Υποβολή αναφοράς από:</strong><br>
                        <strong>ID:</strong> ${reporterId}<br>
                        <strong>Όνομα:</strong> ${reporterName}<br>
                        <strong>Email:</strong> ${reporterEmail}<br>
                        <strong>Username:</strong> ${reporterUsername}<br>
                        <a href="${reporterAdminUrl}" style="color: #122f5e; text-decoration: underline;">Προβολή Αναφέροντα στο Admin</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; font-family: Arial, sans-serif; color: #999;">
                        Η αναφορά υποβλήθηκε από τη σελίδα: <a href="${servicePageUrl}" style="color: #122f5e; text-decoration: underline;">${servicePageUrl}</a>
                      </p>

                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 20px; font-family: Arial, sans-serif; color: #999;">
                        Ημερομηνία: ${reportDateFmt}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

SERVICE_REPORT_TEXT = """
ΑΝΑΦΟΡΑ ΥΠΗΡΕΣΙΑΣ

ΠΕΡΙΓΡΑΦΗ ΖΗΤΗΜΑΤΟΣ:
${reportDetails}

---

ΑΝΑΦΟΡΑ ΓΙΑ ΤΗΝ ΥΠΗΡΕΣΙΑ:
ID: ${serviceId}
Τίτλος: ${serviceTitle}
Slug: ${serviceSlug}
Admin URL: ${serviceAdminUrl}

---

ΥΠΟΒΟΛΗ ΑΝΑΦΟΡΑΣ ΑΠΟ:
ID: ${reporterId}
Όνομα: ${reporterName}
Email: ${reporterEmail}
Username: ${reporterUsername}
Admin URL: ${reporterAdminUrl}

---

Η αναφορά υποβλήθηκε από: ${servicePageUrl}
Ημερομηνία: ${reportDateFmt}

---
© Doulitsa, 2026
"""

PROFILE_REPORT_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αναφορά Προφίλ</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 10px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">

                      <h1 style="font-size: 24px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">Αναφορά Προφίλ</h1>

                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Περιγραφή Ζητήματος:</strong><br>
                        ${reportDetails}
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Αναφορά για το προφίλ:</strong><br>
                        <strong>ID:</strong> ${profileId}<br>
                        <strong>Όνομα:</strong> ${profileName}<br>
                        <strong>Email:</strong> ${profileEmail}<br>
                        <strong>Username:</strong> ${profileUsername}<br>
                        <a href="${reportedUserAdminUrl}" style="color: #122f5e; text-decoration: underline;">Προβολή Αναφερόμενου στο Admin</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                        <strong>Υποβολή αναφοράς από:</strong><br>
                        <strong>ID:</strong> ${reporterId}<br>
                        <strong>Όνομα:</strong> ${reporterName}<br>
                        <strong>Email:</strong> ${reporterEmail}<br>
                        <strong>Username:</strong> ${reporterUsername}<br>
                        <a href="${reporterAdminUrl}" style="color: #122f5e; text-decoration: underline;">Προβολή Αναφέροντα στο Admin</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                      <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; font-family: Arial, sans-serif; color: #999;">
                        Η αναφορά υποβλήθηκε από τη σελίδα: <a href="${profilePageUrl}" style="color: #122f5e; text-decoration: underline;">${profilePageUrl}</a>
                      </p>

                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 20px; font-family: Arial, sans-serif; color: #999;">
                        Ημερομηνία: ${reportDateFmt}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

PROFILE_REPORT_TEXT = """
ΑΝΑΦΟΡΑ ΠΡΟΦΙΛ

ΠΕΡΙΓΡΑΦΗ ΖΗΤΗΜΑΤΟΣ:
${reportDetails}

---

ΑΝΑΦΟΡΑ ΓΙΑ ΤΟ ΠΡΟΦΙΛ:
ID: ${profileId}
Όνομα: ${profileName}
Email: ${profileEmail}
Username: ${profileUsername}
Admin URL: ${reportedUserAdminUrl}

---

ΥΠΟΒΟΛΗ ΑΝΑΦΟΡΑΣ ΑΠΟ:
ID: ${reporterId}
Όνομα: ${reporterName}
Email: ${reporterEmail}
Username: ${reporterUsername}
Admin URL: ${reporterAdminUrl}

---

Η αναφορά υποβλήθηκε από: ${profilePageUrl}
Ημερομηνία: ${reportDateFmt}

---
© Doulitsa, 2026
"""

NEW_PROFILE_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέο Επαγγελματικό Προφίλ</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">
                      <h2 style="font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">${profileName}</h2>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>👤 Στοιχεία Προφίλ:</strong><br>
                        Email: ${userEmail}<br>
                        Τύπος: ${userType}
                      </p>
                      <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>🔧 Ενέργειες:</strong>
                      </p>
                      <a href="${publicUrl}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px 10px 10px 0; font-weight: 700;">
                        Προβολή Προφίλ
                      </a>
                      <a href="${adminUrl}" style="background: #ffffff; color: #122f5e; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px; font-weight: 700; border: 2px solid #122f5e;">
                        Επεξεργασία Προφίλ
                      </a>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 0; font-size: 12px; line-height: 16px; font-family: Arial, sans-serif; color: #999;">
                        Ημερομηνία: ${createdAtFmt}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

NEW_PROFILE_TEXT = """
ΝΕΟ ΕΠΑΓΓΕΛΜΑΤΙΚΟ ΠΡΟΦΙΛ

${profileName}

---

👤 ΣΤΟΙΧΕΙΑ ΠΡΟΦΙΛ:
Email: ${userEmail}
Τύπος: ${userType}

---

🔧 ΕΝΕΡΓΕΙΕΣ:

Προβολή Προφίλ:
${publicUrl}

Επεξεργασία Προφίλ:
${adminUrl}

---
Ημερομηνία: ${createdAtFmt}

© Doulitsa, 2026
"""

NEW_REVIEW_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέα Αξιολόγηση</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">
                      <h2 style="font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">Νέα Αξιολόγηση για ${receiverName}</h2>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Από:</strong> ${authorEmail}
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Πρός:</strong> ${receiverEmail}
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Αξιολόγηση:</strong> ${sentiment}
                      </p>${commentBlock}${serviceBlock}
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <a href="${BASE}/admin/reviews/${reviewId}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px 10px 10px 0; font-weight: 700;">
                        Προβολή Αξιολόγησης
                      </a>
                      <a href="${BASE}/admin/reviews" style="background: #ffffff; color: #122f5e; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px; font-weight: 700; border: 2px solid #122f5e;">
                        Διαχείριση Αξιολογήσεων
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

NEW_REVIEW_TEXT = """
ΝΕΑ ΑΞΙΟΛΟΓΗΣΗ ΓΙΑ ${receiverNameUpper}

Από: ${authorEmail}
Πρός: ${receiverEmail}
Αξιολόγηση: ${sentiment}${commentBlock}${serviceBlock}

---

Προβολή Αξιολόγησης:
${BASE}/admin/reviews/${reviewId}

Διαχείριση Αξιολογήσεων:
${BASE}/admin/reviews

---
© Doulitsa, 2026
"""

REVIEW_APPROVED_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέα Αξιολόγηση!</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643; text-align: center;">
                      <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #122f5e;">Νέα Αξιολόγηση!</h1>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Έλαβες μία ${sentiment} αξιολόγηση
                      </p>${serviceBlock}${commentBlock}
                      <a href="${dashboardUrl}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 20px 10px 10px 10px; font-weight: 700;">
                        Προβολή Αξιολογήσεων
                      </a>
                      <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 24px; font-family: Arial, sans-serif;">
                        Με εκτίμηση,<br />
                        Η ομάδα Doulitsa
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

REVIEW_APPROVED_TEXT = """
ΝΕΑ ΑΞΙΟΛΟΓΗΣΗ!

Έλαβες μία ${sentiment} αξιολόγηση${serviceBlock}${commentBlock}

Προβολή Αξιολογήσεων:
${dashboardUrl}

Με εκτίμηση,
Η ομάδα Doulitsa

---
© Doulitsa, 2026
"""

SERVICE_CREATED_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέα Υπηρεσία</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643;">
                      <h2 style="font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif; color: #122f5e;">${serviceTitle}</h2>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>Περιγραφή:</strong><br>
                        ${serviceDescription}
                      </p>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>👤 Δημιουργός:</strong><br>
                        ${creatorName} (${creatorEmail})
                      </p>
                      <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        <strong>🔧 Ενέργειες:</strong>
                      </p>
                      <a href="${adminReviewUrl}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px 10px 10px 0; font-weight: 700;">
                        Επεξεργασία Υπηρεσίας
                      </a>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 0; font-size: 12px; line-height: 16px; font-family: Arial, sans-serif; color: #999;">
                        Ημερομηνία: ${createdAtFmt}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

SERVICE_CREATED_TEXT = """
ΝΕΑ ΥΠΗΡΕΣΙΑ - ${serviceTitle}

ΠΕΡΙΓΡΑΦΗ:
${serviceDescription}

---

👤 ΔΗΜΙΟΥΡΓΟΣ:
${creatorName} (${creatorEmail})

🔧 ΕΝΕΡΓΕΙΕΣ:
Επεξεργασία υπηρεσίας: ${adminReviewUrl}

---
Ημερομηνία: ${createdAtFmt}

© Doulitsa, 2026
"""

SERVICE_PUBLISHED_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Η υπηρεσία δημοσιεύτηκε</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 30px 42px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #153643; text-align: center;">
                      <h1 style="font-size: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif; color: #122f5e;">🎉 Συγχαρητήρια ${userName}!</h1>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Η υπηρεσία <strong>${serviceTitle}</strong> δημοσιεύτηκε με επιτυχία και είναι πλέον ορατή στην Doulitsa!
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                        Οι πελάτες μπορούν πλέον να την βρουν και να επικοινωνήσουν μαζί σου.
                      </p>
                      <a href="${BASE}/s/${serviceSlug}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 20px 10px 10px 10px; font-weight: 700;">
                        Προβολή Υπηρεσίας
                      </a>
                      <a href="${BASE}/dashboard/services/edit/${serviceId}" style="background: #ffffff; color: #122f5e; text-decoration: none; padding: 16px 30px; border-radius: 4px; display: inline-block; margin: 10px; font-weight: 700; border: 2px solid #122f5e;">
                        Επεξεργασία Υπηρεσίας
                      </a>
                      <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 24px; font-family: Arial, sans-serif;">
                        Καλή επιτυχία!<br /><br />
                        Με εκτίμηση,<br />
                        Η ομάδα Doulitsa
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0; width: 50%;" align="left">
                      <p style="margin: 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026 <br />
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

SERVICE_PUBLISHED_TEXT = """
🎉 ΣΥΓΧΑΡΗΤΗΡΙΑ ${userNameUpper}!

Η υπηρεσία "${serviceTitle}" δημοσιεύτηκε με επιτυχία και είναι πλέον ορατή στην Doulitsa!

Οι πελάτες μπορούν πλέον να την βρουν και να επικοινωνήσουν μαζί σου.

Προβολή Υπηρεσίας:
${BASE}/s/${serviceSlug}

Επεξεργασία Υπηρεσίας:
${BASE}/dashboard/services/edit/${serviceId}

Καλή επιτυχία!

Με εκτίμηση,
Η ομάδα Doulitsa

---
© Doulitsa, 2026
"""

SUPPORT_FEEDBACK_HTML = """<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Νέα Αναφορά Υποστήριξης</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                    <!-- Title -->
                    <tr>
                        <td style="padding: 30px 40px 40px 40px; ">
                            <h1 style="color: #122f5e; font-size: 24px; font-weight: bold;">
                                Νέα Φόρμα Υποστήριξης / Αναφοράς
                            </h1>
                        </td>
                    </tr>

                    <!-- Issue Type Section -->
                    <tr>
                        <td style="padding: 0 40px 20px 40px;">
                            <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 16px; font-weight: bold;">
                                Είδος Ζητήματος:
                            </h3>
                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                ${issueTypeLabel}
                            </p>
                        </td>
                    </tr>

                    <!-- Description Section -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 16px; font-weight: bold;">
                                Περιγραφή Ζητήματος:
                            </h3>
                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                ${description}
                            </p>
                        </td>
                    </tr>

                    <!-- Reporter Details Section -->
                    <tr>
                        <td style="padding: 0 40px 20px 40px; border-top: 1px solid #f0f0f0;">
                            <h3 style="margin: 20px 0 15px 0; color: #333333; font-size: 16px; font-weight: bold;">
                                Υποβολή αναφοράς από:
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 5px 0;">
                                        <span style="color: #666666; font-size: 14px;">ID: ${reporterId}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;">
                                        <span style="color: #666666; font-size: 14px;">Όνομα: ${reporterName}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;">
                                        <span style="color: #666666; font-size: 14px;">Email: ${reporterEmail}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;">
                                        <span style="color: #666666; font-size: 14px;">Username: ${reporterUsername}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0 5px 0;">
                                        <a href="${reporterAdminUrl}" style="color: #122f5e; text-decoration: none; font-size: 14px; font-weight: 500;">
                                            Προβολή Αναφέροντα στο Admin →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                    <!-- Page URL Section -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                Η αναφορά υποβλήθηκε από τη σελίδα: <a href="${pageUrl}" style="color: #122f5e; text-decoration: none;">${pageUrl}</a>
                            </p>
                            <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                                Ημερομηνία: ${formattedDate}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #000; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #fff; font-size: 12px; text-align: left;">
                                © ${year} Doulitsa. 
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

SUPPORT_FEEDBACK_TEXT = """
ΝΕΑ ΦΟΡΜΑ ΥΠΟΣΤΗΡΙΞΗΣ / ΑΝΑΦΟΡΑΣ

ΕΙΔΟΣ ΖΗΤΗΜΑΤΟΣ:
${issueTypeLabel}

ΠΕΡΙΓΡΑΦΗ ΖΗΤΗΜΑΤΟΣ:
${description}

---

ΥΠΟΒΟΛΗ ΑΝΑΦΟΡΑΣ ΑΠΟ:
ID: ${reporterId}
Όνομα: ${reporterName}
Email: ${reporterEmail}
Username: ${reporterUsername}
Admin URL: ${reporterAdminUrl}

---

Η αναφορά υποβλήθηκε από: ${pageUrl}
Ημερομηνία: ${formattedDate}

---
© ${year} Doulitsa
"""

UNREAD_MESSAGES_HTML = """
<!DOCTYPE html>
<html lang="el">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αδιάβαστα Μηνύματα - Doulitsa</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" style="width: 602px; margin-top: 30px; margin-bottom: 30px; border-collapse: separate; border: 1px solid #cccccc; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
            <!-- Header -->
            <tr>
              <td style="padding: 36px 30px 20px 30px;">
                <h1 style="font-size: 24px; margin: 0 0 10px 0; font-family: Arial, sans-serif; color: #122f5e;">
                  ${title}
                </h1>
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                  Γεια σου ${userName}!
                </p>
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; color: #333;">
                  Έλαβες <strong>${countLabel}</strong> τα τελευταία λεπτά.
                </p>
              </td>
            </tr>

            <!-- Messages List -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; border-radius: 8px; overflow: hidden;">
                  ${messageListHTML}
                </table>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td style="padding: 0 30px 36px 30px;">
                <a href="${dashboardUrl}" style="background: #122f5e; color: #ffffff; text-decoration: none; padding: 16px 30px; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px;">
                  Δες τα Μηνύματά σου
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 30px; background: #000;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0;" align="left">
                      <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 16px; font-family: Arial, sans-serif; color: #ffffff;">
                        &reg; Doulitsa, 2026
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

# OLD UNREAD_MESSAGES_TEXT outer template; `${messagesList}` is built by the
# builder (`• {sender} ({time}): {content}` lines joined by a blank line, plus
# the "... και N ακόμη" overflow line).
UNREAD_MESSAGES_TEXT = """
Νέα Μηνύματα - Doulitsa

Γεια σου ${userName}!

Έλαβες ${unreadCount} μηνύματα τα τελευταία λεπτά:

${messagesList}

Δες όλα τα μηνύματά σου: ${dashboardUrl}

---
© Doulitsa, 2026
"""

