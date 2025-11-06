# Quick Start: Using Output Schema

## What You Need to Know

Scripts can tell the task editor what data they produce. This helps you easily connect steps together.

## Adding Output Schema to Your Scripts

### Basic Template

```json
{
  "title": "Your Script Name",
  "description": "What it does",
  "parameters": { ... },
  "outputSchema": {
    "description": "Brief description of output",
    "fields": [
      {
        "name": "fieldName",
        "type": "string",
        "description": "What this field contains",
        "path": "$.data.fieldName"
      }
    ]
  },
  "steps": [ ... ]
}
```

### Common Field Types

| Type | Use For | Example |
|------|---------|---------|
| `string` | Text, names, messages | "John Doe", "Hello World" |
| `number` | Counts, IDs, quantities | 42, 100, 5.5 |
| `boolean` | Yes/No, True/False | true, false |
| `array` | Lists, collections | ["item1", "item2"] |
| `object` | Complex data | {"key": "value"} |

### JSON Path Format

Use `$` to represent the root of output data:

```javascript
$.fieldName              // Top-level field
$.user.name              // Nested field
$.messages[0]            // First array item
$.contacts               // Entire array
$.data.info.detail       // Deep nested field
```

## Real Examples

### Example 1: Simple Data

**Script: Get Page Title**

```json
{
  "title": "Get Page Title",
  "outputSchema": {
    "description": "HTML page title",
    "fields": [
      {
        "name": "title",
        "type": "string",
        "description": "The page's title tag content",
        "path": "$.page.title"
      }
    ]
  }
}
```

**Use in next step:**
```json
{
  "dataMapping": {
    "searchQuery": "$.page.title"
  }
}
```

### Example 2: Multiple Fields

**Script: User Profile**

```json
{
  "title": "Get User Profile",
  "outputSchema": {
    "description": "User profile information",
    "fields": [
      {
        "name": "username",
        "type": "string",
        "description": "User's display name",
        "path": "$.profile.username"
      },
      {
        "name": "email",
        "type": "string",
        "description": "User's email address",
        "path": "$.profile.email"
      },
      {
        "name": "age",
        "type": "number",
        "description": "User's age in years",
        "path": "$.profile.age"
      },
      {
        "name": "verified",
        "type": "boolean",
        "description": "Whether account is verified",
        "path": "$.profile.verified"
      }
    ]
  }
}
```

**Use in next step:**
```json
{
  "dataMapping": {
    "recipientName": "$.profile.username",
    "recipientEmail": "$.profile.email"
  }
}
```

### Example 3: Arrays for Looping

**Script: Get Product List**

```json
{
  "title": "Get Product List",
  "outputSchema": {
    "description": "List of products from page",
    "fields": [
      {
        "name": "products",
        "type": "array",
        "description": "Array of product objects",
        "path": "$.products"
      },
      {
        "name": "firstProduct",
        "type": "string",
        "description": "First product name",
        "path": "$.products[0].name"
      },
      {
        "name": "productCount",
        "type": "number",
        "description": "Total number of products",
        "path": "$.productCount"
      }
    ]
  }
}
```

**Use with loop:**
```json
{
  "loop": {
    "type": "forEach",
    "dataSource": "$.products",
    "maxIterations": 100
  }
}
```

## Common Patterns

### Pattern 1: Search → Extract → Process

```
Step 1: Search (query)
  → Outputs: results (array), firstResult (object)

Step 2: Extract Data (url from $.results[0].url)
  → Outputs: pageData (object), content (string)

Step 3: Process (content from $.pageData.content)
  → Final processing
```

### Pattern 2: List → Loop → Aggregate

```
Step 1: Get List
  → Outputs: items (array)

Step 2: Process Item (loop over $.items)
  → Runs for each item

Step 3: Summary
  → Outputs: summary (string)
```

### Pattern 3: Conditional Branch

```
Step 1: Check Status
  → Outputs: isActive (boolean), status (string)

Step 2: Action (conditional on $.isActive === true)
  → Only runs if condition passes
```

## Using in Task Editor

### When Creating a Task:

1. **Add First Step**
   - Drag script to canvas
   - Configure its parameters

2. **Add Second Step**
   - Drag next script
   - Click to select it
   - See blue "Available Data" box in properties
   - Lists all fields from previous step

3. **Map the Data**
   - Click any field name to copy its path
   - Paste in "Data Mapping" field
   - Example: `{"param": "$.previous.field"}`

4. **For Arrays (Loops)**
   - Enable loop checkbox
   - Click array field to copy path
   - Paste in "Loop Data Source"
   - Choose "forEach" type

5. **For Conditions**
   - Enable condition checkbox
   - Click field to copy path
   - Use in expression: `$.field === 'value'`

## Tips

### ✅ Do:
- Use clear, descriptive field names
- Include helpful descriptions
- Use correct field types
- Document what data structure looks like
- Include both individual fields and collections

### ❌ Don't:
- Use generic names like "data1", "field2"
- Skip descriptions
- Mix up field types (string vs number)
- Make paths too complex
- Forget to update schema when script changes

## Validation

### Good Schema:
```json
{
  "name": "username",
  "type": "string",
  "description": "WhatsApp contact or group name",
  "path": "$.chat.username"
}
```
✅ Clear name
✅ Correct type
✅ Helpful description
✅ Simple path

### Bad Schema:
```json
{
  "name": "data",
  "type": "object",
  "description": "stuff",
  "path": "$.x.y.z.a.b.c.d"
}
```
❌ Vague name
❌ Too generic
❌ Unhelpful description
❌ Overly complex path

## FAQ

**Q: Is output schema required?**
A: No, it's optional. Scripts without it still work, you just won't get auto-suggestions.

**Q: What if my script doesn't actually produce this data?**
A: Schema is a "contract" of what your script should produce. Try to match it, but the system won't break if you don't.

**Q: Can I have multiple schemas for different modes?**
A: Not currently. Define the most common output fields.

**Q: How do I test if my schema works?**
A: Create a task with 2+ steps using your script. Select the second step and see if fields appear.

**Q: Can I update schema later?**
A: Yes! Just edit the JSON file and re-upload the script.

## Examples to Copy

### Social Media Post
```json
{
  "name": "postText",
  "type": "string",
  "description": "Content of the social media post",
  "path": "$.post.text"
},
{
  "name": "likes",
  "type": "number",
  "description": "Number of likes on the post",
  "path": "$.post.likes"
},
{
  "name": "comments",
  "type": "array",
  "description": "Array of comment objects",
  "path": "$.post.comments"
}
```

### E-commerce Product
```json
{
  "name": "productName",
  "type": "string",
  "description": "Name of the product",
  "path": "$.product.name"
},
{
  "name": "price",
  "type": "number",
  "description": "Product price in dollars",
  "path": "$.product.price"
},
{
  "name": "inStock",
  "type": "boolean",
  "description": "Whether product is in stock",
  "path": "$.product.inStock"
},
{
  "name": "images",
  "type": "array",
  "description": "Array of product image URLs",
  "path": "$.product.images"
}
```

### Search Results
```json
{
  "name": "query",
  "type": "string",
  "description": "The search query used",
  "path": "$.search.query"
},
{
  "name": "results",
  "type": "array",
  "description": "Array of search result objects",
  "path": "$.search.results"
},
{
  "name": "resultCount",
  "type": "number",
  "description": "Total number of results",
  "path": "$.search.count"
},
{
  "name": "firstTitle",
  "type": "string",
  "description": "Title of first result",
  "path": "$.search.results[0].title"
}
```

Now you're ready to create powerful, connected task workflows! 🚀
