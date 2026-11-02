# Content ingestion contract (MVP)

Endpoint: `POST /api/ingest`

Authentication header:

```http
Authorization: Bearer <CONTENT_INGEST_TOKEN>
Content-Type: application/json
```

The token must be at least 32 characters and must be configured only in server-side environments. Never expose it to browsers, public pages or client-side bundles.

Maximum request body: 220,000 bytes. The server enforces the limit while reading the request stream, not only by trusting the optional Content-Length header.

## Example request

```json
{
  "source": "example-source",
  "externalId": "example-source-item-123",
  "title": "Example article title",
  "summary": "A concise editorial summary.",
  "bodyMarkdown": "## Analysis\n\nArticle body..."
}
```

The `source` field must be a lowercase slug between 1 and 50 characters, using letters, numbers, underscores or hyphens. Choose values that identify the upstream system without coupling the CMS to a specific provider.

## Behavior

- First accepted submission: HTTP 201; returns `id`, deterministic `slug`, `status=draft`, and `duplicate=false`.
- Repeated submission with the same source and external ID: HTTP 200; returns the existing record and `duplicate=true`.
- Replays do not overwrite editorial changes.
- Concurrent duplicate submissions are protected by a unique database key.
- The endpoint always creates a draft. It cannot publish an article.

## Errors

| Status | Meaning |
|---|---|
| 400 | Invalid JSON, invalid UTF-8, or unreadable request body |
| 401 | Missing or invalid bearer token |
| 413 | Request body exceeds the configured byte limit |
| 422 | Invalid source or content fields |
| 503 | Ingestion is disabled because no valid token is configured |
| 500 | Generic storage failure; database details are not returned |

Do not log bearer tokens, request authorization headers, database URLs or full database error messages.
