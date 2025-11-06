# Script Output Schema Documentation

## Overview

Scripts can now define their output schema to enable automatic data mapping in task workflows. This allows the task editor to suggest available data fields when configuring step parameters and data mappings.

## Output Schema Structure

Add an `outputSchema` property to your script JSON:

```json
{
  "title": "Script Name",
  "description": "Script description",
  "outputSchema": {
    "description": "Description of what this script outputs",
    "fields": [
      {
        "name": "fieldName",
        "type": "string|number|boolean|array|object",
        "description": "Description of this field",
        "path": "$.output.fieldName"
      }
    ]
  }
}
```

## Field Types

- **string**: Text data (usernames, messages, titles)
- **number**: Numeric data (counts, IDs)
- **boolean**: True/false values
- **array**: List of items
- **object**: Complex nested data

## JSON Path Notation

Use JSONPath notation to reference output fields:
- `$.data.username` - Top level data field
- `$.messages[0].text` - First message text from array
- `$.contacts` - Array of contacts

## Examples

### Example 1: WhatsApp Message Reader

```json
{
  "title": "WhatsApp Read Messages",
  "description": "Searches and reads WhatsApp messages",
  "parameters": {
    "searchText1": "Contact Name",
    "searchText2": "Alternative Search"
  },
  "outputSchema": {
    "description": "WhatsApp chat data including usernames and messages",
    "fields": [
      {
        "name": "username",
        "type": "string",
        "description": "Contact or group name",
        "path": "$.chat.username"
      },
      {
        "name": "messages",
        "type": "array",
        "description": "Array of messages from the chat",
        "path": "$.chat.messages"
      },
      {
        "name": "lastMessage",
        "type": "string",
        "description": "Most recent message text",
        "path": "$.chat.lastMessage"
      },
      {
        "name": "messageCount",
        "type": "number",
        "description": "Total number of messages",
        "path": "$.chat.messageCount"
      }
    ]
  },
  "steps": [...]
}
```

### Example 2: Google Search

```json
{
  "title": "Google Search",
  "description": "Performs a Google search and extracts results",
  "parameters": {
    "query": "search term"
  },
  "outputSchema": {
    "description": "Google search results with titles, URLs, and snippets",
    "fields": [
      {
        "name": "results",
        "type": "array",
        "description": "Array of search result objects",
        "path": "$.search.results"
      },
      {
        "name": "title",
        "type": "string",
        "description": "First result title",
        "path": "$.search.results[0].title"
      },
      {
        "name": "url",
        "type": "string",
        "description": "First result URL",
        "path": "$.search.results[0].url"
      },
      {
        "name": "snippet",
        "type": "string",
        "description": "First result description snippet",
        "path": "$.search.results[0].snippet"
      }
    ]
  },
  "steps": [...]
}
```

### Example 3: Web Page Scraper

```json
{
  "title": "Web Page Scraper",
  "description": "Extracts data from a web page",
  "parameters": {
    "url": "https://example.com"
  },
  "outputSchema": {
    "description": "Scraped web page data",
    "fields": [
      {
        "name": "pageTitle",
        "type": "string",
        "description": "HTML page title",
        "path": "$.page.title"
      },
      {
        "name": "pageUrl",
        "type": "string",
        "description": "Current page URL",
        "path": "$.page.url"
      },
      {
        "name": "headings",
        "type": "array",
        "description": "All H1-H3 headings on the page",
        "path": "$.page.headings"
      },
      {
        "name": "links",
        "type": "array",
        "description": "All links found on the page",
        "path": "$.page.links"
      },
      {
        "name": "bodyText",
        "type": "string",
        "description": "Main text content of the page",
        "path": "$.page.bodyText"
      }
    ]
  },
  "steps": [...]
}
```

## Using Output Schema in Task Editor

When you add a script step to a task:

1. **Data Mapping**: The editor will show available output fields from the previous step
2. **Loop Configuration**: For array fields, the editor suggests using them as loop data sources
3. **Conditions**: Field paths can be used in conditional expressions
4. **Parameters**: Output fields can be mapped to parameters of the next step

### Example Task Flow

```
Step 1: Google Search (query: "weather")
  ↓ outputs: $.search.results[0].url

Step 2: Web Page Scraper (url: mapped from $.search.results[0].url)
  ↓ outputs: $.page.bodyText

Step 3: WhatsApp Send Message (message: mapped from $.page.bodyText)
```

## Benefits

1. **Auto-suggestions**: Task editor suggests available fields
2. **Type safety**: Know what type of data each field contains
3. **Documentation**: Clear description of what each script produces
4. **Validation**: Easier to validate data mappings
5. **Reusability**: Scripts are self-documenting

## Implementation Notes

- Output schema is optional but highly recommended
- If no schema is defined, users can still manually enter JSON paths
- Schema helps with UI autocomplete and validation
- Actual script execution doesn't need to match schema exactly (for flexibility)

## Future Enhancements

- Visual schema editor in config page
- Schema validation during task execution
- Auto-generation of schema from script analysis
- Schema-based data transformation helpers
