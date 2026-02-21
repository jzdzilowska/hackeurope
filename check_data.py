from supabase import create_client
import json

client = create_client(
    'https://avlectrfwnguxotveczz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bGVjdHJmd25ndXhvdHZlY3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3ODQxMSwiZXhwIjoyMDg3MjU0NDExfQ.aYNfMnm3xQpUiM1dVVHc-VgYf7a-dGo9-FCjaJ-zJBQ'
)

res = client.table('ai_insights').select('type,data').execute()
for row in res.data:
    print(f"\n{'='*60}")
    print(f"TYPE: {row['type']}")
    print(f"{'='*60}")
    print(json.dumps(row['data'], indent=2))
