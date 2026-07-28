"""Project-wide DRF exception handler enforcing a consistent JSON error shape.

Shape:
    {
        "error": {
            "code":    "<machine readable>",
            "message": "<human readable>",
            "details": <field errors or extra context, optional>
        }
    }

This contract is what the Next.js frontend client expects. Do not change without
also updating the frontend.
"""
from __future__ import annotations

from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class ApiError(exceptions.APIException):
    """Domain-level API error. Subclass for specific error codes."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "error"
    default_detail = "An error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: Any = None,
        status_code: int | None = None,
    ) -> None:
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=message or self.default_detail, code=code or self.default_code)
        # Keep the per-instance code; DRF only stashes it on the ErrorDetail, and the
        # envelope must surface the specific code (e.g. "invalid_credentials") the
        # frontend branches on — not the class-level default.
        self.code = code or self.default_code
        self.details = details


# Common subclasses used across apps -----------------------------------------


class RateLimited(ApiError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_code = "rate_limited"
    default_detail = "Too many requests. Please try again later."


class Conflict(ApiError):
    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"


class Forbidden(ApiError):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = "forbidden"


class NotFound(ApiError):
    status_code = status.HTTP_404_NOT_FOUND
    default_code = "not_found"


class FieldErrors(ApiError):
    """Wrap field-level validation errors in the consistent envelope."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "validation_error"
    default_detail = "One or more fields are invalid."


# ----------------------------------------------------------------------------


def _format_validation(detail: Any) -> dict[str, Any]:
    """Coerce DRF validation detail (dict | list | str) into our shape."""
    if isinstance(detail, dict):
        return {str(k): _stringify(v) for k, v in detail.items()}
    if isinstance(detail, list):
        return {"_errors": [_stringify(item) for item in detail]}
    return {"_errors": [str(detail)]}


def _stringify(value: Any) -> Any:
    if isinstance(value, list):
        return [_stringify(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _stringify(v) for k, v in value.items()}
    return str(value)


def json_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Translate any exception into the project-wide error envelope.

    Why: every endpoint must return errors in the same shape so the Next.js
    frontend can read `response.error.code` reliably without per-endpoint
    branching.
    """
    # Translate Django-native exceptions DRF doesn't catch
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)
    if response is None:
        # Truly unhandled — let Django's default 500 surface, but log it
        return None

    if isinstance(exc, ApiError):
        body = {
            "error": {
                "code": getattr(exc, "code", None) or exc.default_code,
                "message": str(exc.detail),
                "details": exc.details,
            }
        }
    elif isinstance(exc, exceptions.ValidationError):
        body = {
            "error": {
                "code": "validation_error",
                "message": "One or more fields are invalid.",
                "details": _format_validation(exc.detail),
            }
        }
    else:
        # Permission denied, throttled, not authenticated, etc.
        code = getattr(exc, "default_code", "error")
        # DRF's Throttled default_code is "throttled", but the frontend branches
        # on `err.code === 'rate_limited'` (e.g. actions/auth/forgot-password.ts)
        # and shows its own Greek-friendly message.
        if isinstance(exc, exceptions.Throttled):
            code = "rate_limited"
        body = {
            "error": {
                "code": code,
                "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
                "details": None,
            }
        }

    response.data = body
    return response
