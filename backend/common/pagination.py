"""Pagination defaults. Pick the right paginator per endpoint:

- DefaultPageNumberPagination : admin tables, dashboards
- LargePageNumberPagination   : taxonomy listings (24h cached)
- DefaultCursorPagination     : feeds (services/profiles archives)
- MessagesCursorPagination    : chat message stream (descending)
"""
from __future__ import annotations

from rest_framework.pagination import CursorPagination, PageNumberPagination


class DefaultPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "limit"
    max_page_size = 100
    page_query_param = "page"


class LargePageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "limit"
    max_page_size = 200


class DefaultCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "limit"
    max_page_size = 100
    ordering = "-created_at"
    cursor_query_param = "cursor"


class MessagesCursorPagination(CursorPagination):
    """Reverse-chronological, used by chat message endpoints."""

    page_size = 50
    page_size_query_param = "limit"
    max_page_size = 200
    ordering = "-created_at"
    cursor_query_param = "before"
