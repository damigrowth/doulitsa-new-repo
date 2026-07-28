"""Greek → Latin transliteration map. Mirrors `src/lib/utils/text/greek-latin.ts` exactly."""
from __future__ import annotations

GREEK_TO_LATIN: dict[str, str] = {
    # Single Greek letters
    "α": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "ζ": "z",
    "η": "i", "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m",
    "ν": "n", "ξ": "x", "ο": "o", "π": "p", "ρ": "r", "σ": "s",
    "ς": "s", "τ": "t", "υ": "u", "φ": "f", "χ": "x", "ψ": "ps",
    "ω": "o",
    # Accented lowercase
    "ά": "a", "έ": "e", "ή": "i", "ί": "i", "ό": "o", "ύ": "u",
    "ώ": "o", "ϊ": "i", "ϋ": "u", "ΐ": "i", "ΰ": "u",
    # Uppercase
    "Α": "a", "Β": "v", "Γ": "g", "Δ": "d", "Ε": "e", "Ζ": "z",
    "Η": "i", "Θ": "th", "Ι": "i", "Κ": "k", "Λ": "l", "Μ": "m",
    "Ν": "n", "Ξ": "x", "Ο": "o", "Π": "p", "Ρ": "r", "Σ": "s",
    "Τ": "t", "Υ": "u", "Φ": "f", "Χ": "x", "Ψ": "ps", "Ω": "o",
    # Accented uppercase
    "Ά": "a", "Έ": "e", "Ή": "i", "Ί": "i", "Ό": "o", "Ύ": "u",
    "Ώ": "o",
    # Diphthongs / digraphs (lowercase)
    "αι": "ai", "αί": "ai", "αυ": "au", "αύ": "au",
    "ευ": "eu", "εύ": "eu", "ου": "ou", "ού": "ou",
    "υι": "ui", "γγ": "g", "γκ": "g", "μπ": "b",
    "ντ": "nt", "τσ": "ts", "τζ": "tz",
    # Diphthongs / digraphs (uppercase)
    "Αι": "ai", "Αί": "ai", "Αυ": "au", "Αύ": "au",
    "Ευ": "eu", "Εύ": "eu", "Ου": "ou", "Ού": "ou",
    "Υι": "ui", "Γγ": "g", "Γκ": "g", "Μπ": "b",
    "Ντ": "Nt", "Τσ": "ts", "Τζ": "tz",
}
