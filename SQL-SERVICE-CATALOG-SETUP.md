# T7 PrintHub — SQL Service Catalog

The Service Catalog now uses the MySQL/Express API instead of Firestore for service CRUD.

## API expected
- GET `/api/services`
- POST `/api/services`
- PUT `/api/services/:id`
- DELETE `/api/services/:id`

## API base URL
By default the frontend uses `/api`, which is correct when the frontend and Express backend are served from the same origin.

If the backend is on a different host, define this before loading the app:

```html
<script>
  window.T7_API_BASE_URL = 'https://YOUR-BACKEND-HOST/api';
</script>
```

The backend must allow CORS from the frontend origin.

## Data mapping
The frontend maps SQL fields such as `price_unit`, `starting_price`, `created_at`, and `updated_at` to the existing frontend camelCase fields. Extra T7 Shop service fields are stored in `service_data` JSON.
