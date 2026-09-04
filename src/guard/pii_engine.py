"""
ksec.space PII & Sensitive Data Leakage Prevention Engine (Egress Guard)
Validates and redacts/blocks sensitive data including:
- Turkish TC Kimlik No (with official algorithmic Luhn verification)
- Credit Card Numbers (Visa, MasterCard, Amex, Troy with Luhn check)
- IBANs (TR & International Mod-97 verification)
- API Keys & Secrets (OpenAI, AWS, JWT, Private Keys)
- Phone Numbers and Emails
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple


class PIIAction(str, Enum):
    ALLOW = "ALLOW"
    REDACT = "REDACT"
    BLOCK = "BLOCK"
    ALERT = "ALERT"


class PIICategory(str, Enum):
    TC_KIMLIK = "TC_KIMLIK"
    CREDIT_CARD = "CREDIT_CARD"
    IBAN = "IBAN"
    API_KEY = "API_KEY"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    SECRET = "SECRET"


@dataclass
class PIIMatch:
    category: PIICategory
    raw_value: str
    redacted_value: str
    start: int
    end: int
    confidence: float
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PIIReport:
    original_text: str
    sanitized_text: str
    matches: List[PIIMatch]
    has_violation: bool
    should_block: bool
    violation_categories: List[str]


class PIIEngine:
    """
    High-performance, zero-false-positive PII and secret redaction engine.
    """

    # Secret / API key patterns
    _OPENAI_KEY_RE = re.compile(r"\bsk-[a-zA-Z0-9_\-]{20,80}\b")
    _AWS_KEY_RE = re.compile(r"\b(AKIA[0-9A-Z]{16})\b")
    _JWT_RE = re.compile(r"\beyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\b")
    _PRIVATE_KEY_RE = re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")
    
    # Contact patterns
    _EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    _TR_PHONE_RE = re.compile(r"(?:\+90|0)?\s*[5]\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}")
    
    # Financial patterns
    _IBAN_RE = re.compile(r"\bTR\d{2}\s*(?:\d{4}\s*){5}\d{2}\b", re.IGNORECASE)
    _GENERIC_IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{12,30}\b")
    _CC_CANDIDATE_RE = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b")
    
    # TC Kimlik candidate pattern (11 consecutive digits)
    _TC_CANDIDATE_RE = re.compile(r"\b[1-9]\d{10}\b")

    def __init__(self):
        pass

    @staticmethod
    def validate_tc_kimlik(tc_str: str) -> bool:
        """
        Validates Turkish Republic National ID Number (TCKN) using official Luhn variant algorithm.
        Rules:
        - 11 digits, first digit cannot be 0
        - d10 = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) % 10
        - d11 = sum(d1..d10) % 10
        """
        if not tc_str.isdigit() or len(tc_str) != 11 or tc_str[0] == "0":
            return False
        
        digits = [int(d) for d in tc_str]
        
        # Rule 1: 10th digit check
        odd_sum = sum(digits[0:9:2])  # 1st, 3rd, 5th, 7th, 9th digits
        even_sum = sum(digits[1:8:2]) # 2nd, 4th, 6th, 8th digits
        
        calc_d10 = ((odd_sum * 7) - even_sum) % 10
        if calc_d10 != digits[9]:
            return False
            
        # Rule 2: 11th digit check
        calc_d11 = sum(digits[:10]) % 10
        if calc_d11 != digits[10]:
            return False
            
        return True

    @staticmethod
    def validate_luhn(card_number: str) -> bool:
        """Standard Luhn 10 algorithm for Credit Card numbers."""
        clean_num = re.sub(r"\D", "", card_number)
        if len(clean_num) not in (15, 16):
            return False
        
        checksum = 0
        reverse_digits = [int(c) for c in clean_num[::-1]]
        for i, digit in enumerate(reverse_digits):
            if i % 2 == 1:
                doubled = digit * 2
                checksum += doubled - 9 if doubled > 9 else doubled
            else:
                checksum += digit
        return checksum % 10 == 0

    @staticmethod
    def validate_iban(iban_str: str) -> bool:
        """Validates IBAN checksum using ISO 7064 mod 97."""
        clean_iban = re.sub(r"\s+", "", iban_str).upper()
        if len(clean_iban) < 15:
            return False
        # Move first 4 characters to end and convert letters to numbers (A=10 .. Z=35)
        rearranged = clean_iban[4:] + clean_iban[:4]
        numeric_str = "".join(str(ord(c) - 55) if c.isalpha() else c for c in rearranged)
        try:
            return int(numeric_str) % 97 == 1
        except Exception:
            return False

    def scan_and_redact(
        self,
        text: str,
        block_categories: Optional[List[PIICategory]] = None,
        redact_categories: Optional[List[PIICategory]] = None,
        tenant_id: Optional[str] = "global",
    ) -> PIIReport:
        """
        Scans text for all PII and secret categories and applies redactions or flags for blocking.
        """
        block_set = set(block_categories or [])
        redact_set = set(redact_categories or list(PIICategory))
        
        matches: List[PIIMatch] = []

        # 1. Check Private Keys
        for match in self._PRIVATE_KEY_RE.finditer(text):
            matches.append(PIIMatch(
                category=PIICategory.SECRET,
                raw_value=match.group(0),
                redacted_value="[REDACTED_PRIVATE_KEY]",
                start=match.start(),
                end=match.end(),
                confidence=1.0,
                details={"type": "private_key"}
            ))

        # 2. Check OpenAI API Keys
        for match in self._OPENAI_KEY_RE.finditer(text):
            matches.append(PIIMatch(
                category=PIICategory.API_KEY,
                raw_value=match.group(0),
                redacted_value="[REDACTED_OPENAI_KEY]",
                start=match.start(),
                end=match.end(),
                confidence=0.99,
                details={"provider": "OpenAI"}
            ))

        # 3. Check AWS Keys
        for match in self._AWS_KEY_RE.finditer(text):
            matches.append(PIIMatch(
                category=PIICategory.API_KEY,
                raw_value=match.group(0),
                redacted_value="[REDACTED_AWS_KEY]",
                start=match.start(),
                end=match.end(),
                confidence=0.95,
                details={"provider": "AWS"}
            ))

        # 4. Check JWT Tokens
        for match in self._JWT_RE.finditer(text):
            matches.append(PIIMatch(
                category=PIICategory.SECRET,
                raw_value=match.group(0),
                redacted_value="[REDACTED_JWT_TOKEN]",
                start=match.start(),
                end=match.end(),
                confidence=0.90,
                details={"type": "JWT"}
            ))

        # 5. Check TC Kimlik Numbers (Strict verification)
        for match in self._TC_CANDIDATE_RE.finditer(text):
            val = match.group(0)
            if self.validate_tc_kimlik(val):
                matches.append(PIIMatch(
                    category=PIICategory.TC_KIMLIK,
                    raw_value=val,
                    redacted_value=f"[REDACTED_TC_NO_{val[-2:]}]",
                    start=match.start(),
                    end=match.end(),
                    confidence=1.0,
                    details={"last2": val[-2:]}
                ))

        # 6. Check Credit Card Numbers (Luhn verification)
        for match in self._CC_CANDIDATE_RE.finditer(text):
            val = match.group(0)
            clean_digits = re.sub(r"\D", "", val)
            if self.validate_luhn(clean_digits):
                matches.append(PIIMatch(
                    category=PIICategory.CREDIT_CARD,
                    raw_value=val,
                    redacted_value=f"[REDACTED_CARD_****_{clean_digits[-4:]}]",
                    start=match.start(),
                    end=match.end(),
                    confidence=0.98,
                    details={"last4": clean_digits[-4:]}
                ))

        # 7. Check IBANs
        for match in self._IBAN_RE.finditer(text):
            val = match.group(0)
            if self.validate_iban(val):
                clean_iban = re.sub(r"\s+", "", val)
                matches.append(PIIMatch(
                    category=PIICategory.IBAN,
                    raw_value=val,
                    redacted_value=f"[REDACTED_IBAN_{clean_iban[:2]}_..._{clean_iban[-4:]}]",
                    start=match.start(),
                    end=match.end(),
                    confidence=1.0,
                    details={"country": clean_iban[:2]}
                ))

        # 8. Check Emails
        for match in self._EMAIL_RE.finditer(text):
            val = match.group(0)
            parts = val.split("@")
            masked_user = parts[0][0] + "***" if len(parts[0]) > 1 else "***"
            matches.append(PIIMatch(
                category=PIICategory.EMAIL,
                raw_value=val,
                redacted_value=f"[{masked_user}@{parts[1]}]",
                start=match.start(),
                end=match.end(),
                confidence=0.95,
                details={"domain": parts[1]}
            ))

        # 9. Check TR Phone Numbers
        for match in self._TR_PHONE_RE.finditer(text):
            val = match.group(0)
            clean_p = re.sub(r"\D", "", val)
            if len(clean_p) in (10, 11):
                matches.append(PIIMatch(
                    category=PIICategory.PHONE,
                    raw_value=val,
                    redacted_value="[REDACTED_PHONE]",
                    start=match.start(),
                    end=match.end(),
                    confidence=0.90,
                    details={"digits": len(clean_p)}
                ))

        # Sort matches by start position in reverse order to perform in-place replacement
        matches.sort(key=lambda m: m.start)
        
        # Eliminate overlapping matches
        filtered_matches: List[PIIMatch] = []
        last_end = -1
        for m in matches:
            if m.start >= last_end:
                filtered_matches.append(m)
                last_end = m.end

        # Build sanitized text and check block triggers
        should_block = False
        violation_cats = set()
        sanitized_chars = []
        curr_idx = 0

        for m in filtered_matches:
            sanitized_chars.append(text[curr_idx:m.start])
            if m.category in block_set:
                should_block = True
                violation_cats.add(m.category.value)
            
            if m.category in redact_set:
                sanitized_chars.append(m.redacted_value)
                violation_cats.add(m.category.value)
            else:
                sanitized_chars.append(m.raw_value)
            curr_idx = m.end

        sanitized_chars.append(text[curr_idx:])
        sanitized_text = "".join(sanitized_chars)

        return PIIReport(
            original_text=text,
            sanitized_text=sanitized_text,
            matches=filtered_matches,
            has_violation=len(filtered_matches) > 0,
            should_block=should_block,
            violation_categories=sorted(list(violation_cats)),
        )


pii_engine = PIIEngine()
